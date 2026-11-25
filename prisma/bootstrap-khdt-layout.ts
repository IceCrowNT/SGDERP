/** One-time survey import. Dry-run by default; preserve existing IDs/assignments.
 * npx tsx prisma/bootstrap-khdt-layout.ts --reuse=11:78,12:79 [--apply]
 * Existing IDs must be supplied explicitly after the room mapping is checked.
 */
import {loadEnvConfig} from '@next/env';
import {PrismaClient,Prisma} from '@prisma/client';
import {readFile} from 'node:fs/promises';
import {BuildingMappingSchema,resolveBuilding} from '../src/lib/office-3d/building-mapping';
import {KHDT_DESKS,KHDT_ROOM_KEY} from '../src/lib/office-3d/khdt-layout';
import {placementError} from '../src/lib/office-3d/placement';
loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const db=new PrismaClient();
const source='khdt-survey-20261117';
const apply=process.argv.includes('--apply');
const reuse=new Map<number,number>();
for(const pair of (process.argv.find(a=>a.startsWith('--reuse='))?.slice(8) ?? '').split(',').filter(Boolean)){
 const [n,id]=pair.split(':').map(Number);
 if(!Number.isInteger(n)||n<1||n>12||!Number.isInteger(id)||id<1||reuse.has(n)||[...reuse.values()].includes(id))throw Error('Invalid explicit reuse mapping');
 reuse.set(n,id);
}
async function main(){
 const mapping=BuildingMappingSchema.parse(JSON.parse(await readFile('var/office-3d/building.json','utf8')));
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id = ${mapping.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${mapping.companyId}::int)`;
  const rows=await tx.vi_tri.findMany({where:{company_id:mapping.companyId}});
  const room=resolveBuilding(mapping,rows)?.rooms.find(r=>r.key===KHDT_ROOM_KEY);
  if(!room?.row || room.state!=='active')throw Error('KHDT physical room must be linked and active');
  const prior=await tx.nhat_ky_hoat_dong.findMany({where:{company_id:mapping.companyId,phan_he:'LOCATIONS',du_lieu_moi:{path:['nguon'],equals:source}}});
  if(prior.length){if(prior.length!==12)throw Error('Partial survey audit requires manual review');return {status:'already-imported',records:prior.map(p=>p.du_lieu_moi)};}
  const children=rows.filter(r=>r.parent_id===room.row!.id);
  const objects=await tx.vat_the_3d.findMany({where:{company_id:mapping.companyId,phong_id:room.row.id}});
  if(children.length!==reuse.size || children.some(r=>![...reuse.values()].includes(r.id)))throw Error('Map every existing child explicitly; do not create duplicate positions');
  for(const id of reuse.values())if(!children.some(r=>r.id===id&&r.dang_su_dung&&r.loai_vi_tri==='CHO_NGOI')||!objects.some(o=>o.vi_tri_id===id&&o.loai_vat_the==='BAN'))throw Error('Reuse target must be an active desk in this room');
  for(const desk of KHDT_DESKS){const error=placementError(KHDT_ROOM_KEY,desk,KHDT_DESKS.filter(d=>d!==desk));if(error)throw Error(`Desk ${desk.number}: ${error}`);}
  const preview=KHDT_DESKS.map(d=>({...d,locationId:reuse.get(d.number)??null,name:children.find(r=>r.id===reuse.get(d.number))?.ten_vi_tri ?? `Vị trí ${String(d.number).padStart(2,'0')}`}));
  if(!apply)return {status:'dry-run',roomId:room.row.id,create:12-reuse.size,reuse:reuse.size,desks:preview};
  const created=[];
  for(const desk of preview){
   const before=desk.locationId ? objects.find(o=>o.vi_tri_id===desk.locationId)! : null;
   const location=desk.locationId ? children.find(r=>r.id===desk.locationId)! : await tx.vi_tri.create({data:{company_id:mapping.companyId,parent_id:room.row.id,ten_vi_tri:desk.name,loai_vi_tri:'CHO_NGOI'}});
   const data={toa_do_x:desk.x,toa_do_z:desk.z,goc_xoay:desk.angle};
   const object=before ? await tx.vat_the_3d.update({where:{id:before.id},data}) : await tx.vat_the_3d.create({data:{...data,company_id:mapping.companyId,phong_id:room.row.id,vi_tri_id:location.id,loai_vat_the:'BAN'}});
   const record={nguon:source,so_vi_tri:desk.number,vi_tri_id:location.id,vat_the_id:object.id,phong_id:room.row.id,...data};
   await tx.nhat_ky_hoat_dong.create({data:{company_id:mapping.companyId,ten_dang_nhap:'bootstrap-khdt',ho_ten:'Nhập sơ đồ KHĐT theo xác nhận',phan_he:'LOCATIONS',doi_tuong_id:`vi_tri:${location.id}`,ten_doi_tuong:location.ten_vi_tri,hanh_dong:before?'UPDATE':'CREATE',mo_ta:'Bố trí KHĐT theo bản khảo sát; giữ các liên kết nhân sự và tài sản',
     ...(before?{du_lieu_cu:{vat_the_id:before.id,toa_do_x:before.toa_do_x,toa_do_z:before.toa_do_z,goc_xoay:before.goc_xoay}}:{}),du_lieu_moi:record}});
   created.push(record);
  }
  return {status:'imported',roomId:room.row.id,records:created};
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
 console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Import failed');process.exitCode=1}).finally(()=>db.$disconnect());
