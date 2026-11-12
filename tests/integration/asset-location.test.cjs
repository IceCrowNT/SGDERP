/* eslint-disable @typescript-eslint/no-require-imports -- Install Next request shims before real actions. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/);
const request = new AsyncLocalStorage(), originalLoad = Module._load;
const invalidations = [];
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath(path) { invalidations.push(path); } };
  return originalLoad.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { assignAssetLocation, getAssetLocationCandidates } = require('../../src/actions/asset.ts');
const { getHcnsRoom } = require('../../src/actions/office-room.ts');
const as = async (account, fn) => request.run(account ? await createSessionToken({userId:account.id,companyId:account.company_id,sessionVersion:account.phien_ban_dang_nhap}) : undefined, fn);
let company, foreign, category, manager, viewer, none, parent, place, otherPlace, foreignPlace, person, department;
const run = randomUUID().slice(0,8);
async function account(tenant, grants) {
  const permissions = await db.quyen.findMany({where:{OR:grants.map(([phan_he,hanh_dong])=>({phan_he,hanh_dong,pham_vi:'ALL'}))}});
  const role = await db.vai_tro.create({data:{company_id:tenant,ma_vai_tro:`A3D-${randomUUID()}`,ten_vai_tro:'3D test',danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
  return db.tai_khoan.create({data:{company_id:tenant,ten_dang_nhap:`a3d-${randomUUID()}`,ten_hien_thi:'3D test',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
}
const asset = (extra={}) => db.tai_san.create({data:{company_id:company.id,loai_tai_san_id:category.id,ten_tai_san:`PC ${randomUUID()}`,hinh_thuc_su_dung:'CA_NHAN',nguoi_su_dung_id:person.id,phong_quan_ly_id:department.id,ghi_chu:'Private notes',so_serial:'Private serial',...extra}});
const payload = (row, locationId, confirmMove=false) => ({assetId:row.id,version:row.updated_at.toISOString(),locationId,confirmMove});
const fresh = row => db.tai_san.findUniqueOrThrow({where:{id:row.id}});
before(async()=>{
 company=await db.cong_ty.create({data:{ten_cong_ty:`Asset location ${run}`}});
 foreign=await db.cong_ty.create({data:{ten_cong_ty:`Other ${run}`}});
 category=await db.loai_tai_san.create({data:{company_id:company.id,ma_loai:'PC',ten_loai:'Máy tính'}});
 manager=await account(company.id,[['ASSETS','MANAGE']]); viewer=await account(company.id,[['ASSETS','VIEW']]); none=await account(company.id,[['LOCATIONS','MANAGE'],['HR','MANAGE']]);
 parent=await db.vi_tri.create({data:{company_id:company.id,ten_vi_tri:'Phòng thử',loai_vi_tri:'PHONG'}});
 place=await db.vi_tri.create({data:{company_id:company.id,parent_id:parent.id,ten_vi_tri:'Bàn A',loai_vi_tri:'CHO_NGOI'}});
 otherPlace=await db.vi_tri.create({data:{company_id:company.id,parent_id:parent.id,ten_vi_tri:'Điểm máy in',loai_vi_tri:'DIEM_DAT_THIET_BI'}});
 foreignPlace=await db.vi_tri.create({data:{company_id:foreign.id,ten_vi_tri:'Other',loai_vi_tri:'PHONG'}});
 person=await db.nhan_su.create({data:{company_id:company.id,ho_ten:'Người thử',tinh_trang_lam_viec:'ACTIVE'}});
 department=await db.phong_ban.create({data:{company_id:company.id,ma_phong_ban:'IT',ten_phong_ban:'IT'}});
});
after(()=>db.$disconnect());

test('assignment needs ASSETS MANAGE and strict same-company inputs',async()=>{
 const row=await asset();
 for(const actor of [null,viewer,none]) {
  assert.equal((await as(actor,()=>assignAssetLocation(payload(row,place.id)))).success,false);
  assert.equal((await as(actor,()=>getAssetLocationCandidates())).success,false);
 }
 for(const input of [{...payload(row,place.id),companyId:foreign.id},{...payload(row,place.id),employeeId:person.id},payload(row,foreignPlace.id),payload(row,99999999),{...payload(row,place.id),version:'invalid'}])
  assert.equal((await as(manager,()=>assignAssetLocation(input))).success,false);
 const foreignActor=await account(foreign.id,[['ASSETS','MANAGE']]);
 assert.equal((await as(foreignActor,()=>assignAssetLocation(payload(row,foreignPlace.id)))).success,false);
 assert.deepEqual(await fresh(row),row);
});

test('assign, confirm transfer and clear change only location; same place is idempotent and history is scoped',async()=>{
 const row=await asset();
 assert.equal((await as(manager,()=>assignAssetLocation(payload(row,place.id)))).success,true);
 let current=await fresh(row);
 const compare=({...row,vi_tri_id:place.id,updated_at:current.updated_at}); assert.deepEqual(current,compare);
 const count=()=>db.nhat_ky_hoat_dong.count({where:{company_id:company.id,phan_he:'ASSETS',doi_tuong_id:`tai_san:${row.id}`}});
 assert.equal(await count(),1);
 assert.equal((await as(manager,()=>assignAssetLocation(payload(current,place.id)))).success,true); assert.equal(await count(),1);
 assert.equal((await as(manager,()=>assignAssetLocation(payload(current,otherPlace.id)))).code,'CONFIRM_MOVE');
 assert.equal((await as(manager,()=>assignAssetLocation(payload(current,otherPlace.id,true)))).success,true);
 current=await fresh(row);
 assert.equal((await as(manager,()=>assignAssetLocation(payload(current,null)))).code,'CONFIRM_MOVE');
 assert.equal((await as(manager,()=>assignAssetLocation(payload(current,null,true)))).success,true);
 current=await fresh(row);assert.deepEqual(current,{...row,updated_at:current.updated_at});assert.equal(await count(),3);
 const event=await db.nhat_ky_hoat_dong.findFirstOrThrow({where:{doi_tuong_id:`tai_san:${row.id}`,company_id:company.id},orderBy:{id:'desc'}});
 assert(event.du_lieu_cu.duong_dan_vi_tri.includes('Điểm máy in'));assert.equal(event.du_lieu_moi.duong_dan_vi_tri,'Chưa xác định vị trí');
 assert(invalidations.includes('/office-3d'));assert(invalidations.includes('/assets'));
});

test('stale and concurrent writes do not overwrite, and retired devices retain physical location management',async()=>{
 const row=await asset({tinh_trang:'NGUNG_SU_DUNG'});
 const results=await Promise.all([place,otherPlace].map(loc=>as(manager,()=>assignAssetLocation(payload(row,loc.id)))));
 assert.equal(results.filter(r=>r.success).length,1);assert.equal(results.find(r=>!r.success).code,'STALE');
 const current=await fresh(row);assert.equal(current.tinh_trang,'NGUNG_SU_DUNG');
 assert.equal((await as(manager,()=>assignAssetLocation(payload(row,null,true)))).code,'STALE');
});

test('inactive target is rejected, DB prevents inactive ancestry, and audit failure rolls back',async()=>{
 const stopped=await db.vi_tri.create({data:{company_id:company.id,ten_vi_tri:'Ngừng',loai_vi_tri:'PHONG',dang_su_dung:false}});
 await assert.rejects(db.vi_tri.create({data:{company_id:company.id,parent_id:stopped.id,ten_vi_tri:'Con',loai_vi_tri:'DIEM_DAT_THIET_BI'}}));
 const row=await asset();
 for(const id of [stopped.id])assert.equal((await as(manager,()=>assignAssetLocation(payload(row,id)))).success,false);
 await db.$executeRawUnsafe(`CREATE FUNCTION test_3d_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id=${company.id} AND NEW.phan_he='ASSETS' THEN RAISE EXCEPTION 'rollback test'; END IF; RETURN NEW; END $$`);
 await db.$executeRawUnsafe('CREATE TRIGGER test_3d_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_3d_audit_failure()');
 try{assert.equal((await as(manager,()=>assignAssetLocation(payload(row,place.id)))).success,false);assert.deepEqual(await fresh(row),row);}
 finally{await db.$executeRawUnsafe('DROP TRIGGER test_3d_audit_failure ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION test_3d_audit_failure()');}
});

test('paged picker returns minimal fields and no other-company records',async()=>{
 const name=`Picker_${run}`;
 for(let i=0;i<22;i++)await asset({ten_tai_san:`${name} ${i}`});
 const a=await as(manager,()=>getAssetLocationCandidates({search:name}));
 const b=await as(manager,()=>getAssetLocationCandidates({search:name,page:2}));
 assert.equal(a.rows.length,20);assert.equal(b.rows.length,2);assert.equal(a.hasMore,true);assert.equal(b.hasMore,false);
 assert(!a.rows.some(r=>b.rows.some(s=>r.id===s.id)));assert(!JSON.stringify(a).includes('Private'));
 assert.equal((await as(manager,()=>getAssetLocationCandidates({companyId:foreign.id}))).success,false);
});

test('3D data requires ASSETS independently of HR; moved links cannot expose assets',async()=>{
 const map=JSON.parse(readFileSync('var/office-3d/hcns.json','utf8'));
 const assetReader=await account(map.companyId,[['LOCATIONS','VIEW'],['ASSETS','VIEW']]);
 const locationReader=await account(map.companyId,[['LOCATIONS','VIEW']]);
 const c=await db.loai_tai_san.create({data:{company_id:map.companyId,ma_loai:`PC_${run.toUpperCase()}`,ten_loai:'PC'}});
 const target=map.points[2];
 const row=await db.tai_san.create({data:{company_id:map.companyId,loai_tai_san_id:c.id,vi_tri_id:target.locationId,ten_tai_san:`Private3D_${run}`}});
 const read=()=>as(assetReader,()=>getHcnsRoom());
 const result=await read();assert.equal(result.success,true);assert.equal(result.room.canViewEmployees,false);
 const point=result.room.points.find(p=>p.key===target.key);
 assert(point.assets.some(a=>a.id===row.id));assert(point.equipment.includes('pc'));assert.equal(point.occupants,undefined);
 const hidden=await as(locationReader,()=>getHcnsRoom());
 assert(!JSON.stringify(hidden).includes(row.ten_tai_san));assert(hidden.room.points.every(p=>p.assets===undefined&&p.equipment.length===0));
 await db.vi_tri.update({where:{id:target.locationId},data:{parent_id:null}});
 try {const moved=await read();const p=moved.room.points.find(p=>p.key===target.key);assert.equal(p.state,'unlinked');assert.equal(p.assets.length,0);assert.equal(p.equipment.length,0);}
 finally{await db.vi_tri.update({where:{id:target.locationId},data:{parent_id:map.roomId}});}
});

test('permission revocation and invalidated session reject further assignment',async()=>{
 const temp=await account(company.id,[['ASSETS','MANAGE']]);const row=await asset();
 const token=await createSessionToken({userId:temp.id,companyId:company.id,sessionVersion:temp.phien_ban_dang_nhap});
 await db.tai_khoan.update({where:{id:temp.id},data:{phien_ban_dang_nhap:{increment:1}}});
 assert.equal((await request.run(token,()=>assignAssetLocation(payload(row,place.id)))).success,false);
 const roles=await db.tai_khoan_vai_tro.findMany({where:{account_id:manager.id}});
 await db.vai_tro_quyen.deleteMany({where:{role_id:{in:roles.map(r=>r.role_id)}}});
 assert.equal((await as(manager,()=>assignAssetLocation(payload(row,place.id)))).success,false);
 assert.equal((await as(manager,()=>getAssetLocationCandidates())).success,false);
});
