/** Import historical HCNS desks once, keeping all location IDs and assignments.
 * Dry-run: npx tsx prisma/bootstrap-hcns-layout.ts ; apply: append --apply.
 * Reads hcns.json only during this import. Viewer uses vat_the_3d exclusively.
 */
import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { RoomMappingSchema } from '../src/lib/office-3d/room-mapping';
import { BuildingMappingSchema, resolveBuilding } from '../src/lib/office-3d/building-mapping';
import { HCNS_BUILDING_KEY } from '../src/lib/office-3d/building-layout';
import { HCNS_LAYOUT } from './data/hcns-survey';
loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const db = new PrismaClient();
const source = 'hcns-db-layout-20261117';
async function main() {
  const mapping = RoomMappingSchema.parse(JSON.parse(await readFile('var/office-3d/hcns.json','utf8')));
  const building = BuildingMappingSchema.parse(JSON.parse(await readFile('var/office-3d/building.json','utf8')));
  if (mapping.companyId !== building.companyId) throw Error('Mapping companies differ');
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id = ${mapping.companyId} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${mapping.companyId}::int)`;
    const rows = await tx.vi_tri.findMany({where:{company_id:mapping.companyId}});
    const room = resolveBuilding(building,rows)?.rooms.find(r=>r.key===HCNS_BUILDING_KEY);
    if (room?.state !== 'active' || room.row?.id !== mapping.roomId) throw Error('Active HCNS room mapping required');
    const prior = await tx.nhat_ky_hoat_dong.count({where:{company_id:mapping.companyId,phan_he:'LOCATIONS',du_lieu_moi:{path:['nguon'],equals:source}}});
    if (prior) {
      if (prior !== 10) throw Error('Partial import requires review');
      return {status:'already-imported',created:0};
    }
    const existing = await tx.vat_the_3d.findMany({where:{company_id:mapping.companyId}});
    const desks = HCNS_LAYOUT.map(slot=>{
      const id = mapping.points.find(p=>p.key===slot.key)!.locationId;
      const row = rows.find(r=>r.id===id && r.parent_id===mapping.roomId && ['CHO_NGOI','DIEM_DAT_THIET_BI'].includes(r.loai_vi_tri));
      if (!row) throw Error(`Invalid original location for ${slot.key}`);
      if (existing.some(o=>o.vi_tri_id===id || o.khoa_cu===slot.key)) throw Error(`Existing layout conflict for ${slot.key}; do not overwrite`);
      return {company_id:mapping.companyId,phong_id:mapping.roomId,vi_tri_id:id,loai_vat_the:'BAN',
        toa_do_x:slot.x,toa_do_z:slot.z,goc_xoay:slot.facingDegrees,chieu_rong:slot.width,chieu_sau:slot.depth,khoa_cu:slot.key};
    });
    if (!process.argv.includes('--apply')) return {status:'dry-run',desks};
    const records=[];
    for (const data of desks) {
      const object = await tx.vat_the_3d.create({data});
      await tx.nhat_ky_hoat_dong.create({data:{company_id:mapping.companyId,ten_dang_nhap:'bootstrap-hcns',ho_ten:'Chuyển bố trí HCNS sang DB',
        phan_he:'LOCATIONS',doi_tuong_id:`vi_tri:${data.vi_tri_id}`,ten_doi_tuong:rows.find(r=>r.id===data.vi_tri_id)!.ten_vi_tri,
        hanh_dong:'UPDATE',mo_ta:'Lưu bố trí gốc vào DB; giữ ID, tên và liên kết người/tài sản',du_lieu_moi:{nguon:source,vat_the_id:object.id,...data}}});
      records.push({id:object.id,locationId:data.vi_tri_id,key:data.khoa_cu});
    }
    return {status:'imported',records};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
  console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Import failed');process.exitCode=1}).finally(()=>db.$disconnect());
