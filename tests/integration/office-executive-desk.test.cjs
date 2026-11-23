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
const as=async(a,fn)=>request.run(a?await createSessionToken({userId:a.id,companyId:a.company_id,sessionVersion:a.phien_ban_dang_nhap}):undefined,fn);
const ok=r=>{assert(r.success,r.message);return r;};
after(()=>db.$disconnect());
test('executive desk persists and switches model without changing the location business fields',async()=>{
 const file=JSON.parse(require('node:fs').readFileSync('var/office-3d/building.json','utf8'));
 await db.vat_the_3d.deleteMany({where:{vi_tri:{ten_vi_tri:'Bàn Tổng giám đốc thử nghiệm'}}});
 await db.vi_tri.deleteMany({where:{ten_vi_tri:'Bàn Tổng giám đốc thử nghiệm'}});
 await db.tai_khoan.deleteMany({where:{ten_dang_nhap:'executive-test'}});
 await db.vai_tro.deleteMany({where:{ma_vai_tro:'EXECUTIVE-TEST'}});
 const grant=await db.quyen.findFirstOrThrow({where:{phan_he:'LOCATIONS',pham_vi:'ALL',hanh_dong:'MANAGE'}});
 const role=await db.vai_tro.create({data:{company_id:file.companyId,ma_vai_tro:'EXECUTIVE-TEST',ten_vai_tro:'Executive test',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 const manager=await db.tai_khoan.create({data:{company_id:file.companyId,ten_dang_nhap:'executive-test',ten_hien_thi:'Test',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 const building=ok(await as(manager,read)).building;
 const room=building.rooms.find(r=>r.key==='plan_t2_giua_sau');assert(room?.locationId);
 const seat=await db.vi_tri.create({data:{company_id:file.companyId,parent_id:room.locationId,ten_vi_tri:'Bàn Tổng giám đốc thử nghiệm',loai_vi_tri:'CHO_NGOI'}});
 const input={roomKey:room.key,roomId:room.locationId,locationId:seat.id,locationVersion:seat.updated_at.toISOString(),name:seat.ten_vi_tri,kind:'BAN',model:'BAN_TONG_GIAM_DOC',x:0,z:0,angle:0};
 assert.equal((await as(null,()=>save(input))).success,false);
 assert.equal((await as(manager,()=>save({...input,kind:'DIEM'}))).success,false);
 const links=await db.vi_tri.findUniqueOrThrow({where:{id:seat.id}});
 ok(await as(manager,()=>save(input)));
 let object=await db.vat_the_3d.findFirstOrThrow({where:{vi_tri_id:seat.id,company_id:file.companyId}});
 assert.equal(object.mau_hien_thi,'BAN_TONG_GIAM_DOC');assert.equal(object.chieu_rong,2.4);assert.equal(object.chieu_sau,1.2);
 assert.equal(ok(await as(manager,read)).building.objects.find(o=>o.id===object.id).model,'BAN_TONG_GIAM_DOC');
 await assert.rejects(db.vat_the_3d.update({where:{id:object.id},data:{loai_vat_the:'DIEM'}}));
 await assert.rejects(db.vat_the_3d.update({where:{id:object.id},data:{mau_hien_thi:'UNKNOWN'}}));
 for(const model of ['MAC_DINH','BAN_TONG_GIAM_DOC']){
  const loc=await db.vi_tri.findUniqueOrThrow({where:{id:seat.id}});
  ok(await as(manager,()=>save({...input,id:object.id,version:object.updated_at.toISOString(),locationVersion:loc.updated_at.toISOString(),model})));
  object=await db.vat_the_3d.findUniqueOrThrow({where:{id:object.id}});
  assert.equal(object.vi_tri_id,seat.id);assert.equal(object.chieu_rong,model==='MAC_DINH'?1.6:2.4);
 }
 assert.equal(await db.vat_the_3d.count({where:{vi_tri_id:seat.id}}),1);
 const final=await db.vi_tri.findUniqueOrThrow({where:{id:seat.id}});
 assert.deepEqual({...final,updated_at:links.updated_at},links);
});
