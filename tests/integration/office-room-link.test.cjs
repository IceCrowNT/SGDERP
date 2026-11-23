/* eslint-disable @typescript-eslint/no-require-imports -- Real DB/auth; only request cookies and Next cache are stubbed. */
const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {AsyncLocalStorage}=require('node:async_hooks');
const Module=require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/sdg_room_links_test_\d+$/);
const request=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,...args){
 if(name==='next/headers')return {cookies:async()=>({get:()=>request.getStore()?{value:request.getStore()}:undefined})};
 if(name==='next/cache')return {revalidatePath(){}};
 return load.call(this,name,...args);
};
const {db}=require('../../src/lib/db.ts');
const {createSessionToken}=require('../../src/lib/session-token.ts');
const A=require('../../src/actions/office-room-link.ts');
const {getOfficeBuilding}=require('../../src/actions/office-building.ts');
const {saveOfficePlacement}=require('../../src/actions/office-placement.ts');
const {BUILDING_ROOMS}=require('../../src/lib/office-3d/building-layout.ts');
const {readBuildingMapping}=require('../../src/lib/office-3d/building-mapping-server.ts');
const {placementError}=require('../../src/lib/office-3d/placement.ts');
const as=async(a,fn)=>request.run(a?await createSessionToken({userId:a.id,companyId:a.company_id,sessionVersion:a.phien_ban_dang_nhap}):undefined,fn);
const ok=r=>{assert(r.success,r.message);return r;};
after(()=>db.$disconnect());
test('room binding from selection to shared management',async t=>{
 const file=JSON.parse(require('node:fs').readFileSync('var/office-3d/building.json','utf8'));
 const companyId=file.companyId,floor=file.floors.find(f=>f.floor===2).locationId;
 const available=BUILDING_ROOMS.filter(r=>r.floor===2&&r.placed&&r.kind==='room'&&!file.rooms.some(m=>m.key===r.key));
 assert(available.length>=4);const keys=available.map(r=>r.key);
 const grants=await db.quyen.findMany({where:{phan_he:'LOCATIONS'}});
 const accounts={};
 for(const level of ['MANAGE','VIEW','NONE']){
  const role=await db.vai_tro.create({data:{company_id:companyId,ma_vai_tro:`LINK-TEST-${level}`,ten_vai_tro:`Link test ${level}`,danh_sach_quyen:level==='NONE'?undefined:{create:{permission_id:grants.find(g=>g.hanh_dong===level&&g.pham_vi==='ALL').id}}}});
  accounts[level]=await db.tai_khoan.create({data:{company_id:companyId,ten_dang_nhap:`link-test-${level.toLowerCase()}`,ten_hien_thi:level,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 }
 const manager=accounts.MANAGE;
 const make=(name,extra={})=>db.vi_tri.create({data:{company_id:companyId,parent_id:floor,ten_vi_tri:name,loai_vi_tri:'PHONG',...extra}});
 const room=await make('Room link test'),other=await make('Room link race'),rollback=await make('Room link rollback');
 const inactive=await make('Inactive',{dang_su_dung:false}),wrongType=await make('Seat',{loai_vi_tri:'CHO_NGOI'}),wrongFloor=await make('Other floor',{parent_id:file.floors.find(f=>f.floor===1).locationId});
 await t.test('only manager can select; only active unbound rooms on correct floor are returned',async()=>{
  for(const a of [null,accounts.NONE,accounts.VIEW]){
   assert.equal((await as(a,()=>A.getRoomLinkOptions(keys[0]))).success,false);
   assert.equal((await as(a,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:room.id}))).success,false);
  }
  const options=ok(await as(manager,()=>A.getRoomLinkOptions(keys[0])));
  assert(options.rooms.some(r=>r.id===room.id));
  for(const id of [...file.rooms.map(r=>r.locationId),inactive.id,wrongType.id,wrongFloor.id])assert(!options.rooms.some(r=>r.id===id));
  for(const id of [inactive.id,wrongType.id,wrongFloor.id,file.rooms[0].locationId])assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:id}))).success,false);
  assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:0}))).success,false);
  assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:room.id,companyId:999}))).success,false);
  for(const key of ['unknown','plan_t2_thong_tang',file.rooms[0].key])assert.equal((await as(manager,()=>A.getRoomLinkOptions(key))).success,false);
  const floor3=BUILDING_ROOMS.find(r=>r.floor===3&&r.placed&&r.kind==='room');
  if(!file.floors.some(f=>f.floor===3))assert.equal((await as(manager,()=>A.getRoomLinkOptions(floor3.key))).success,false);
 });
 await t.test('atomic binding and audit; generic placement works without granting HR or assets',async()=>{
  ok(await as(manager,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:room.id})));
  const link=await db.lien_ket_phong_3d.findFirstOrThrow({where:{khoa_phong:keys[0],company_id:companyId}});
  assert.equal(link.vi_tri_id,room.id);
  assert.equal(await db.nhat_ky_hoat_dong.count({where:{doi_tuong_id:`lien_ket_phong_3d:${link.id}`}}),1);
  const mapping=await readBuildingMapping(companyId,db);for(const old of file.rooms)assert(mapping.rooms.some(r=>r.key===old.key&&r.locationId===old.locationId));
  let pos;for(let x=-10;x<=10&&!pos;x+=.5)for(let z=-10;z<=10&&!pos;z+=.5){const p={x,z,angle:0,kind:'BAN'};if(!placementError(keys[0],p))pos=p;}
  assert(pos);ok(await as(manager,()=>saveOfficePlacement({roomKey:keys[0],roomId:room.id,name:'Test desk',...pos})));
  const data=ok(await as(manager,getOfficeBuilding));
  const json=JSON.stringify(data);assert(json.includes('Test desk'));
  assert.equal(data.building.canManageEmployees,false);assert.equal(data.building.canManageAssets,false);
 });
 await t.test('two rooms cannot claim the same location; two requests cannot overwrite a room',async()=>{
  const results=await Promise.all([keys[1],keys[2]].map(roomKey=>as(manager,()=>A.linkOfficeRoom({roomKey,locationId:other.id}))));
  assert.equal(results.filter(r=>r.success).length,1);
  assert.equal(await db.lien_ket_phong_3d.count({where:{vi_tri_id:other.id}}),1);
  assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[0],locationId:rollback.id}))).success,false);
 });
 await t.test('audit failure rolls back binding',async()=>{
  const mapping=await readBuildingMapping(companyId,db),key=keys.find(k=>!mapping.rooms.some(r=>r.key===k));assert(key);
  await db.$executeRawUnsafe(`CREATE FUNCTION test_link_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.doi_tuong_id LIKE 'lien_ket_phong_3d:%' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER test_link_audit_fail BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_link_audit_fail()`);
  try{assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:key,locationId:rollback.id}))).success,false);assert.equal(await db.lien_ket_phong_3d.count({where:{khoa_phong:key}}),0);}
  finally{await db.$executeRawUnsafe('DROP TRIGGER test_link_audit_fail ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION test_link_audit_fail()');}
 });
 await t.test('foreign tenant rejected; FK uniqueness and dependent deletion preserved',async()=>{
  const foreignCompany=await db.cong_ty.create({data:{ten_cong_ty:'Room link foreign test'}});
  const foreignRoom=await db.vi_tri.create({data:{company_id:foreignCompany.id,ten_vi_tri:'Foreign',loai_vi_tri:'PHONG'}});
  assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[3],locationId:foreignRoom.id}))).success,false);
  await assert.rejects(()=>db.lien_ket_phong_3d.create({data:{company_id:companyId,khoa_phong:'test-foreign',vi_tri_id:foreignRoom.id}}));
  await assert.rejects(()=>db.lien_ket_phong_3d.create({data:{company_id:companyId,khoa_phong:'test-duplicate',vi_tri_id:room.id}}));
  await db.vi_tri.delete({where:{id:other.id}});assert.equal(await db.lien_ket_phong_3d.count({where:{vi_tri_id:other.id}}),0);
 });
 await t.test('revoked session cannot bind',async()=>{
  await db.tai_khoan.update({where:{id:manager.id},data:{phien_ban_dang_nhap:{increment:1}}});
  assert.equal((await as(manager,()=>A.linkOfficeRoom({roomKey:keys[3],locationId:rollback.id}))).success,false);
 });
});
