/* eslint-disable @typescript-eslint/no-require-imports -- Real isolated DB/auth; stub only request cookies and Next cache. */
const assert=require('node:assert/strict');
const {test,after}=require('node:test');
const {AsyncLocalStorage}=require('node:async_hooks');
const Module=require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/sdg_reception_test_\d+$/);
const request=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,...args){
 if(name==='next/headers')return {cookies:async()=>({get:()=>request.getStore()?{value:request.getStore()}:undefined})};
 if(name==='next/cache')return {revalidatePath(){}};
 return load.call(this,name,...args);
};
const {db}=require('../../src/lib/db.ts');
const {createSessionToken}=require('../../src/lib/session-token.ts');
const {saveOfficePlacement:save}=require('../../src/actions/office-placement.ts');
const {getOfficeBuilding:read}=require('../../src/actions/office-building.ts');
const {placementError}=require('../../src/lib/office-3d/placement.ts');
const as=async(a,fn)=>request.run(a?await createSessionToken({userId:a.id,companyId:a.company_id,sessionVersion:a.phien_ban_dang_nhap}):undefined,fn);
const ok=r=>{assert(r.success,r.message);return r;};
after(()=>db.$disconnect());
test('reception and existing-position placement share the room workflow',async t=>{
 const file=JSON.parse(require('node:fs').readFileSync('var/office-3d/building.json','utf8'));
 const companyId=file.companyId;
 const locationId=file.rooms.find(r=>r.key==='t1_letan').locationId;
 const reception=await db.vi_tri.findUniqueOrThrow({where:{id:locationId}});
 const grants=await db.quyen.findMany({where:{phan_he:'LOCATIONS',pham_vi:'ALL'}}),accounts={};
 for(const level of ['MANAGE','VIEW']){
  const role=await db.vai_tro.create({data:{company_id:companyId,ma_vai_tro:`RECEPTION-${level}`,ten_vai_tro:`Reception ${level}`,danh_sach_quyen:{create:{permission_id:grants.find(g=>g.hanh_dong===level).id}}}});
  accounts[level]=await db.tai_khoan.create({data:{company_id:companyId,ten_dang_nhap:`reception-test-${level.toLowerCase()}`,ten_hien_thi:level,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 }
 const manager=accounts.MANAGE;
 const input={roomKey:'t1_letan',roomId:locationId,locationId,locationVersion:reception.updated_at.toISOString(),name:reception.ten_vi_tri,kind:'BAN',model:'QUAY_LE_TAN',x:0,z:0,angle:180};
 const counts={locations:await db.vi_tri.count(),people:await db.nhan_su.count(),assets:await db.tai_san.count()};
 let object;
 await t.test('authorization and existing point are mandatory',async()=>{
  for(const a of [null,accounts.VIEW]) assert.equal((await as(a,()=>save(input))).success,false);
  for(const extra of [{locationId:undefined},{locationId:999999},{kind:'DIEM'},{model:'UNKNOWN'},{locationVersion:new Date(0).toISOString()}])
   assert.equal((await as(manager,()=>save({...input,...extra}))).success,false);
 });
 await t.test('concurrent attach creates one model, no new location or changed business links',async()=>{
  const results=await Promise.all([1,2].map(()=>as(manager,()=>save(input))));
  assert.equal(results.filter(r=>r.success).length,1);
  object=await db.vat_the_3d.findFirstOrThrow({where:{vi_tri_id:locationId,company_id:companyId}});
  assert.equal(object.phong_id,reception.parent_id);assert.equal(object.mau_hien_thi,'QUAY_LE_TAN');assert.equal(object.goc_xoay,180);
  assert.equal(object.chieu_rong,2.6);assert.equal(object.chieu_sau,1.1);
  assert.deepEqual(await db.vi_tri.findUnique({where:{id:locationId}}),reception);
  assert.deepEqual({locations:await db.vi_tri.count(),people:await db.nhan_su.count(),assets:await db.tai_san.count()},counts);
  const data=ok(await as(manager,read)).building;
  const placed=data.objects.find(o=>o.point.locationId===locationId);assert(placed);
  assert.equal(placed.roomKey,'t1_letan');assert.equal(placed.roomId,locationId);assert.equal(placed.model,'QUAY_LE_TAN');
  assert.equal(data.canViewEmployees,false);assert.equal(placed.point.occupants,undefined);assert.equal(placed.point.assets,undefined);
 });
 await t.test('moving and switching visual model keep the same location; stale updates rejected',async()=>{
  const edit={...input,id:object.id,version:object.updated_at.toISOString(),x:.2};
  ok(await as(manager,()=>save(edit)));
  assert.equal((await as(manager,()=>save({...edit,x:.4}))).success,false);
  const fresh=await db.vat_the_3d.findUniqueOrThrow({where:{id:object.id}}),loc=await db.vi_tri.findUniqueOrThrow({where:{id:locationId}});
  ok(await as(manager,()=>save({...edit,model:'MAC_DINH',version:fresh.updated_at.toISOString(),locationVersion:loc.updated_at.toISOString()})));
  const updated=await db.vat_the_3d.findUniqueOrThrow({where:{id:object.id}});
  assert.equal(updated.vi_tri_id,locationId);assert.equal(updated.chieu_rong,1.6);
 });
 await t.test('ordinary rooms can attach an existing seat without modifying employee or asset associations',async()=>{
  const room=file.rooms.find(r=>r.key==='plan_t2_phai_truoc');assert(room);
  const seat=await db.vi_tri.create({data:{company_id:companyId,parent_id:room.locationId,ten_vi_tri:'Existing empty seat test',loai_vi_tri:'CHO_NGOI',mo_ta:'Keep metadata'}});
  let data=ok(await as(manager,read)).building;
  assert(data.rooms.find(r=>r.key===room.key).availablePoints.some(p=>p.id===seat.id));
  const others=data.objects.filter(o=>o.roomKey===room.key);let position;
  for(let x=-10;x<=10&&!position;x+=.4)for(let z=-10;z<=10&&!position;z+=.4){const p={kind:'BAN',x,z,angle:0};if(!placementError(room.key,p,others))position=p;}
  assert(position);
  const v={...position,roomKey:room.key,roomId:room.locationId,locationId:seat.id,locationVersion:seat.updated_at.toISOString(),name:'Do not rename on attach'};
  const wrong=await db.vi_tri.create({data:{company_id:companyId,parent_id:reception.parent_id,ten_vi_tri:'Wrong parent',loai_vi_tri:'CHO_NGOI'}});
  assert.equal((await as(manager,()=>save({...v,locationId:wrong.id,locationVersion:wrong.updated_at.toISOString()}))).success,false);
  const n=await db.vi_tri.count();ok(await as(manager,()=>save(v)));assert.equal(await db.vi_tri.count(),n);
  assert.deepEqual(await db.vi_tri.findUnique({where:{id:seat.id}}),seat);
  data=ok(await as(manager,read)).building;
  assert(!data.rooms.find(r=>r.key===room.key).availablePoints.some(p=>p.id===seat.id));
  assert.equal(data.objects.find(o=>o.point.locationId===seat.id).point.name,seat.ten_vi_tri);
 });
 await t.test('moving location away invalidates model and stale edits',async()=>{
  const fresh=await db.vat_the_3d.findUniqueOrThrow({where:{id:object.id}});
  await db.vi_tri.update({where:{id:locationId},data:{parent_id:file.floors.find(f=>f.floor===2).locationId}});
  assert(!ok(await as(manager,read)).building.objects.some(o=>o.id===object.id));
  assert.equal((await as(manager,()=>save({...input,id:object.id,version:fresh.updated_at.toISOString()}))).success,false);
 });
});
