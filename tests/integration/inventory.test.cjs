/* eslint-disable @typescript-eslint/no-require-imports -- Real PostgreSQL and auth; only request context/cache are mocked. */
const assert=require('node:assert/strict');
const {test,before,after}=require('node:test');
const {AsyncLocalStorage}=require('node:async_hooks');
const {randomUUID}=require('node:crypto');
const Module=require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/sdg_assets_test_\d+$/);
const request=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,...args){if(name==='next/headers')return {cookies:async()=>({get:()=>request.getStore()?{value:request.getStore()}:undefined})};if(name==='next/cache')return {revalidatePath(){}};return load.call(this,name,...args);};
const {db}=require('../../src/lib/db.ts');
const {createSessionToken}=require('../../src/lib/session-token.ts');
const A=require('../../src/actions/inventory.ts');
const as=async(a,fn)=>request.run(a?await createSessionToken({userId:a.id,companyId:a.company_id,sessionVersion:a.phien_ban_dang_nhap}):undefined,fn);
let company,manager,viewer,none,foreign,grant,role,place,second,person,department,accessory,consumable;
const ok=r=>{assert(r.success,r.message);return r;};
const detail=async id=>ok(await as(manager,()=>A.getInventoryDetail(id)));
const newItem=async(kind='PHU_KIEN',name='Chuột không dây')=>ok(await as(manager,()=>A.saveInventoryItem({name,categoryId:kind==='PHU_KIEN'?accessory.id:consumable.id,unit:'cái',minimum:2,departmentId:department.id,notes:'',active:true}))).row;
async function payload(id,operation,extra={}){return {itemId:id,operation,quantity:1,fromId:null,toId:null,employeeId:null,departmentId:null,issueId:null,reversalId:null,price:null,reason:'Kiểm thử nghiệp vụ',notes:'',requestId:randomUUID(),expected:(await detail(id)).expected,...extra};}
const record=async(id,operation,extra={})=>as(manager,async()=>A.recordInventoryTransaction(await payload(id,operation,extra)));
const stock=async id=>(await detail(id)).stock.reduce((s,r)=>s+r.quantity,0);
const outstanding=async id=>(await detail(id)).issues.reduce((s,r)=>s+r.remaining,0);
before(async()=>{
 const run=randomUUID().slice(0,8);company=await db.cong_ty.create({data:{ten_cong_ty:`Inventory integration ${run}`}});
 const grants=await db.quyen.findMany({where:{phan_he:'INVENTORY'}});assert.equal(grants.length,2);grant=grants.find(g=>g.hanh_dong==='MANAGE');
 for(const level of ['manager','viewer','none']){
   const r=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:level.toUpperCase(),ten_vai_tro:level,danh_sach_quyen:level==='none'?undefined:{create:{permission_id:grants.find(g=>g.hanh_dong===(level==='manager'?'MANAGE':'VIEW')).id}}}});
   const a=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:`inv-${run}-${level}`,ten_hien_thi:level,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:r.id}}}});
   if(level==='manager'){manager=a;role=r;}else if(level==='viewer')viewer=a;else none=a;
 }
 const other=await db.cong_ty.create({data:{ten_cong_ty:'Other inventory'}});
 const fr=await db.vai_tro.create({data:{company_id:other.id,ma_vai_tro:'FOREIGN',ten_vai_tro:'Foreign',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 foreign=await db.tai_khoan.create({data:{company_id:other.id,ten_dang_nhap:`inv-foreign-${run}`,ten_hien_thi:'Foreign',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:fr.id}}}});
 place=await db.vi_tri.create({data:{company_id:company.id,ten_vi_tri:'Tủ vật tư',loai_vi_tri:'KHU_VUC'}});
 second=await db.vi_tri.create({data:{company_id:company.id,ten_vi_tri:'Kho dự phòng',loai_vi_tri:'PHONG'}});
 person=await db.nhan_su.create({data:{company_id:company.id,ho_ten:'Nguyễn An',tinh_trang_lam_viec:'ACTIVE',thu_dien_tu:'private@example.test',so_dien_thoai:'private'}});
 department=await db.phong_ban.create({data:{company_id:company.id,ma_phong_ban:'IT',ten_phong_ban:'Phòng IT'}});
 accessory=ok(await as(manager,()=>A.saveInventoryCategory({code:'PK',name:'Phụ kiện máy tính',kind:'PHU_KIEN',description:'',active:true}))).row;
 consumable=ok(await as(manager,()=>A.saveInventoryCategory({code:'MUC',name:'Mực in',kind:'TIEU_HAO',description:'',active:true}))).row;
});
after(async()=>db.$disconnect());

test('permissions, company scope and minimal options do not grant HR/ASSETS',async()=>{
 const item=await newItem();
 for(const a of [null,none]){assert.equal((await as(a,()=>A.getInventory({kind:'PHU_KIEN'}))).success,false);assert.equal((await as(a,A.getInventoryOptions)).success,false);}
 const opts=ok(await as(manager,A.getInventoryOptions));assert(opts.employees.some(e=>e.id===person.id));assert(!JSON.stringify(opts).includes('private'));assert.equal(ok(await as(viewer,A.getInventoryOptions)).employees.length,0);
 assert.equal((await as(foreign,()=>A.getInventoryDetail(item.id))).success,false);
 assert.equal((await as(viewer,()=>A.recordInventoryTransaction(awaitable))).success,false);
 function awaitable(){} // even a malformed payload is denied before validation
 const p=await payload(item.id,'NHAP',{toId:place.id});assert.equal((await as(none,()=>A.recordInventoryTransaction(p))).success,false);
 const foreignPlace=await db.vi_tri.create({data:{company_id:foreign.company_id,ten_vi_tri:'Other',loai_vi_tri:'PHONG'}});
 assert.equal((await record(item.id,'NHAP',{toId:foreignPlace.id})).success,false);
 assert.equal((await as(manager,()=>A.recordInventoryTransaction({...p,companyId:foreign.company_id}))).success,false);
});

test('accessory: receive 20, issue 2, return 1; stock 19, outstanding 1 and append-only history',async()=>{
 const item=await newItem();assert.match(item.ma_mat_hang,/^VT-\d{6,}$/);assert.equal((await detail(item.id)).recorded,false);
 ok(await record(item.id,'NHAP',{quantity:20,toId:place.id,price:'100000'}));
 const issue=ok(await record(item.id,'CAP_PHAT',{quantity:2,fromId:place.id,employeeId:person.id}));
 ok(await record(item.id,'THU_HOI',{quantity:1,toId:second.id,issueId:issue.id}));
 assert.equal(await stock(item.id),19);assert.equal(await outstanding(item.id),1);
 assert.equal((await record(item.id,'THU_HOI',{quantity:2,toId:second.id,issueId:issue.id})).success,false);
 ok(await record(item.id,'GIAM_DANG_CAP',{quantity:1,issueId:issue.id}));assert.equal(await outstanding(item.id),0);assert.equal(await stock(item.id),19);
 assert.equal(await db.nhat_ky_hoat_dong.count({where:{company_id:company.id,phan_he:'INVENTORY',doi_tuong_id:{startsWith:'giao_dich_vat_tu:'},du_lieu_moi:{path:['mat_hang_vat_tu_id'],equals:item.id}}}),4);
 await assert.rejects(()=>db.giao_dich_vat_tu.update({where:{id:issue.id},data:{so_luong:1}}),/chỉ được ghi thêm/);
 await assert.rejects(()=>db.giao_dich_vat_tu.delete({where:{id:issue.id}}),/chỉ được ghi thêm/);
});

test('consumables issue to department without return obligations; zero opening distinguishes unknown',async()=>{
 const item=await newItem('TIEU_HAO','Mực máy in');ok(await record(item.id,'TON_DAU',{quantity:0,toId:place.id}));
 assert.equal((await detail(item.id)).recorded,true);assert.equal(await stock(item.id),0);
 assert.equal((await record(item.id,'TON_DAU',{quantity:10,toId:place.id})).success,false);
 ok(await record(item.id,'NHAP',{quantity:20,toId:place.id}));const issue=ok(await record(item.id,'CAP_PHAT',{quantity:2,fromId:place.id,departmentId:department.id}));
 assert.equal(await stock(item.id),18);assert.equal(await outstanding(item.id),0);assert.equal((await record(item.id,'THU_HOI',{issueId:issue.id,toId:place.id})).success,false);
 assert.equal((await record(item.id,'CAP_PHAT',{fromId:place.id,employeeId:person.id,departmentId:department.id})).success,false);
});

test('transfer is atomic; adjustments require reasons; stock cannot go negative through SQL',async()=>{
 const item=await newItem();ok(await record(item.id,'NHAP',{quantity:10,toId:place.id}));
 ok(await record(item.id,'CHUYEN_NOI_GIU',{quantity:4,fromId:place.id,toId:second.id}));
 assert.deepEqual((await detail(item.id)).stock.map(r=>[r.locationId,r.quantity]).sort(),[[place.id,6],[second.id,4]].sort());
 assert.equal((await record(item.id,'CHUYEN_NOI_GIU',{quantity:7,fromId:place.id,toId:second.id})).success,false);assert.equal(await stock(item.id),10);
 assert.equal((await record(item.id,'DIEU_CHINH_GIAM',{quantity:1,fromId:place.id,reason:''})).success,false);
 await assert.rejects(()=>db.giao_dich_vat_tu.create({data:{company_id:company.id,mat_hang_vat_tu_id:item.id,loai_giao_dich:'CAP_PHAT',so_luong:99,vi_tri_xuat_id:place.id,nhan_su_nhan_id:person.id,request_id:randomUUID(),account_id:manager.id}}),/vượt tồn/);
 assert.equal(await stock(item.id),10);
});

test('reversals require reverse dependency order and immutable copied effects',async()=>{
 const item=await newItem();const receipt=ok(await record(item.id,'NHAP',{quantity:10,toId:place.id}));
 const issue=ok(await record(item.id,'CAP_PHAT',{quantity:3,fromId:place.id,employeeId:person.id}));
 const returned=ok(await record(item.id,'THU_HOI',{quantity:1,toId:place.id,issueId:issue.id}));
 assert.equal((await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:issue.id})).success,false);
 const undoReturn=ok(await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:returned.id}));assert.equal(await outstanding(item.id),3);
 assert.equal((await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:undoReturn.id})).success,false);
 ok(await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:issue.id}));assert.equal(await outstanding(item.id),0);assert.equal(await stock(item.id),10);
 assert.equal((await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:issue.id})).success,false);
 ok(await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:receipt.id}));assert.equal(await stock(item.id),0);
});

test('idempotency returns the first result; different payload/revoked permission cannot reuse it',async()=>{
 const item=await newItem();const p=await payload(item.id,'NHAP',{quantity:5,toId:place.id});
 const first=ok(await as(manager,()=>A.recordInventoryTransaction(p)));
 const again=ok(await as(manager,()=>A.recordInventoryTransaction(p)));assert.equal(first.id,again.id);assert.equal(await stock(item.id),5);
 assert.equal((await as(manager,()=>A.recordInventoryTransaction({...p,quantity:6}))).success,false);
 await db.vai_tro_quyen.delete({where:{role_id_permission_id:{role_id:role.id,permission_id:grant.id}}});
 assert.equal((await as(manager,()=>A.recordInventoryTransaction(p))).success,false);
 await db.vai_tro_quyen.create({data:{role_id:role.id,permission_id:grant.id}});
 const audit=await db.nhat_ky_hoat_dong.count({where:{company_id:company.id,doi_tuong_id:`giao_dich_vat_tu:${first.id}`}});assert.equal(audit,1);
});

test('competing issues/returns/reversals and stale snapshots: only one succeeds',async()=>{
 const item=await newItem();ok(await record(item.id,'NHAP',{quantity:5,toId:place.id}));
 const p=await payload(item.id,'CAP_PHAT',{quantity:4,fromId:place.id,employeeId:person.id});
 const result=await Promise.all([as(manager,()=>A.recordInventoryTransaction(p)),as(manager,()=>A.recordInventoryTransaction({...p,requestId:randomUUID()}))]);assert.equal(result.filter(r=>r.success).length,1);assert.equal(await stock(item.id),1);
 const issue=result.find(r=>r.success);const ret=await payload(item.id,'THU_HOI',{quantity:3,toId:place.id,issueId:issue.id});
 const returns=await Promise.all([as(manager,()=>A.recordInventoryTransaction(ret)),as(manager,()=>A.recordInventoryTransaction({...ret,requestId:randomUUID()}))]);assert.equal(returns.filter(r=>r.success).length,1);assert.equal(await outstanding(item.id),1);
 const undo=await payload(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:returns.find(r=>r.success).id});const results=await Promise.all([as(manager,()=>A.recordInventoryTransaction(undo)),as(manager,()=>A.recordInventoryTransaction({...undo,requestId:randomUUID()}))]);assert.equal(results.filter(r=>r.success).length,1);
});

test('raw concurrent SQL still cannot over-issue or over-return',async()=>{
 const item=await newItem();ok(await record(item.id,'NHAP',{quantity:5,toId:place.id}));
 const data={company_id:company.id,mat_hang_vat_tu_id:item.id,loai_giao_dich:'CAP_PHAT',so_luong:4,vi_tri_xuat_id:place.id,nhan_su_nhan_id:person.id,account_id:manager.id};
 const outcomes=await Promise.allSettled([db.giao_dich_vat_tu.create({data:{...data,request_id:randomUUID()}}),db.giao_dich_vat_tu.create({data:{...data,request_id:randomUUID()}})]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(await stock(item.id),1);
 const issue=outcomes.find(r=>r.status==='fulfilled').value;
 const ret={...data,loai_giao_dich:'THU_HOI',so_luong:3,vi_tri_xuat_id:null,vi_tri_nhap_id:place.id,cap_phat_goc_id:issue.id};
 const returned=await Promise.allSettled([db.giao_dich_vat_tu.create({data:{...ret,request_id:randomUUID()}}),db.giao_dich_vat_tu.create({data:{...ret,request_id:randomUUID()}})]);assert.equal(returned.filter(r=>r.status==='fulfilled').length,1);assert.equal(await outstanding(item.id),1);
});

test('catalog versioning, frozen unit/kind/code, stop lifecycle and location/department history',async()=>{
 const item=await newItem();ok(await record(item.id,'NHAP',{quantity:1,toId:place.id}));
 const v={id:item.id,version:item.updated_at.toISOString(),name:'Updated',categoryId:item.loai_vat_tu_id,unit:item.don_vi_tinh,minimum:0,departmentId:item.phong_quan_ly_id,notes:'',active:true};
 const saved=ok(await as(manager,()=>A.saveInventoryItem(v)));assert.equal((await as(manager,()=>A.saveInventoryItem(v))).success,false);
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,version:saved.row.updated_at.toISOString(),unit:'hộp'}))).success,false);
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,version:saved.row.updated_at.toISOString(),active:false}))).success,false);
 await assert.rejects(()=>db.mat_hang_vat_tu.update({where:{id:item.id},data:{loai_vat_tu_id:consumable.id}}),/không đổi mã hoặc hạng mục/);
 await assert.rejects(()=>db.vi_tri.update({where:{id:place.id},data:{dang_su_dung:false}}),/còn tồn/);
 await assert.rejects(()=>db.vi_tri.delete({where:{id:place.id}}));await assert.rejects(()=>db.phong_ban.delete({where:{id:department.id}}));
 ok(await record(item.id,'DIEU_CHINH_GIAM',{quantity:1,fromId:place.id}));ok(await as(manager,()=>A.saveInventoryItem({...v,version:saved.row.updated_at.toISOString(),active:false})));
});

test('audit failure rolls back ledger and stock, not just log',async()=>{
 const item=await newItem();
 await db.$executeRawUnsafe(`CREATE FUNCTION test_inventory_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.phan_he='INVENTORY' AND NEW.doi_tuong_id LIKE 'giao_dich_vat_tu:%' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
 await db.$executeRawUnsafe('CREATE TRIGGER test_inventory_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_inventory_audit_failure()');
 try{assert.equal((await record(item.id,'NHAP',{quantity:5,toId:place.id})).success,false);assert.equal(await stock(item.id),0);assert.equal((await detail(item.id)).recorded,false);}finally{await db.$executeRawUnsafe('DROP TRIGGER test_inventory_audit_failure ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION test_inventory_audit_failure()');}
});

test('unaccented server search, low stock uses company total even when filtering one place',async()=>{
 const item=await newItem('TIEU_HAO','Giấy trắng đặc biệt');ok(await record(item.id,'NHAP',{quantity:10,toId:place.id}));ok(await record(item.id,'CHUYEN_NOI_GIU',{quantity:1,fromId:place.id,toId:second.id}));
 const result=ok(await as(manager,()=>A.getInventory({kind:'TIEU_HAO',search:'giay dac',locationId:second.id})));assert.equal(result.rows.length,1);assert.equal(result.rows[0].stock,1);assert.equal(result.rows[0].totalStock,10);assert.equal(result.rows[0].low,false);
 const low=ok(await as(manager,()=>A.getInventory({kind:'TIEU_HAO',search:'giay dac',locationId:second.id,low:true})));assert.equal(low.rows.length,0);
});

test('raw CHECKs/FKs reject irrelevant fields, cross-item references and fabricated reversals',async()=>{
 const item=await newItem(),other=await newItem();
 const base={company_id:company.id,mat_hang_vat_tu_id:item.id,loai_giao_dich:'NHAP',so_luong:5,vi_tri_nhap_id:place.id,account_id:manager.id};
 for(const extra of [{so_luong:0},{so_luong:-1},{nhan_su_nhan_id:person.id},{vi_tri_xuat_id:second.id},{don_gia:-1}])await assert.rejects(()=>db.giao_dich_vat_tu.create({data:{...base,...extra,request_id:randomUUID()}}));
 const receipt=ok(await record(item.id,'NHAP',{quantity:5,toId:place.id,price:'00010'}));
 const issue=ok(await record(item.id,'CAP_PHAT',{quantity:2,fromId:place.id,employeeId:person.id}));
 assert.equal((await record(other.id,'THU_HOI',{issueId:issue.id,toId:place.id})).success,false);
 const raw=await db.giao_dich_vat_tu.findUniqueOrThrow({where:{id:receipt.id}});
 const {id,created_at,...data}=raw;void id;void created_at;
 await assert.rejects(()=>db.giao_dich_vat_tu.create({data:{...data,loai_giao_dich:'DAO_GIAO_DICH',dao_giao_dich_id:receipt.id,so_luong:1,ly_do:'fake',request_id:randomUUID()}}),/giữ nguyên tác động/);
 assert.equal(await stock(item.id),3);
});

test('zero opening can reverse once; departed receivers can return but cannot receive new issues',async()=>{
 const item=await newItem();const opening=ok(await record(item.id,'TON_DAU',{quantity:0,toId:place.id}));ok(await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:opening.id}));
 assert.equal((await record(item.id,'TON_DAU',{quantity:0,toId:place.id})).success,false);
 const employee=await db.nhan_su.create({data:{company_id:company.id,ho_ten:'Departing',tinh_trang_lam_viec:'ACTIVE'}});
 ok(await record(item.id,'NHAP',{quantity:2,toId:place.id}));const issue=ok(await record(item.id,'CAP_PHAT',{quantity:1,fromId:place.id,employeeId:employee.id}));
 await db.nhan_su.update({where:{id:employee.id},data:{tinh_trang_lam_viec:'LEFT'}});
 assert.equal((await record(item.id,'CAP_PHAT',{fromId:place.id,employeeId:employee.id})).success,false);
 ok(await record(item.id,'THU_HOI',{issueId:issue.id,toId:second.id}));assert.equal(await outstanding(item.id),0);
});

test('same idempotency key submitted concurrently creates one ledger entry and one audit',async()=>{
 const item=await newItem();const p=await payload(item.id,'NHAP',{quantity:2,toId:place.id});
 const r=await Promise.all([as(manager,()=>A.recordInventoryTransaction(p)),as(manager,()=>A.recordInventoryTransaction(p))]);r.forEach(ok);assert.equal(r[0].id,r[1].id);assert.equal(await stock(item.id),2);
 assert.equal(await db.nhat_ky_hoat_dong.count({where:{company_id:company.id,doi_tuong_id:`giao_dich_vat_tu:${r[0].id}`}}),1);
});

test('empty location can deactivate but history prevents deleting it; no new receipts or reversal restores there',async()=>{
 const loc=await db.vi_tri.create({data:{company_id:company.id,ten_vi_tri:'Old cabinet',loai_vi_tri:'KHU_VUC'}});const item=await newItem();
 ok(await record(item.id,'NHAP',{toId:loc.id}));const move=ok(await record(item.id,'CHUYEN_NOI_GIU',{fromId:loc.id,toId:place.id}));
 await db.vi_tri.update({where:{id:loc.id},data:{dang_su_dung:false}});
 assert.equal((await record(item.id,'NHAP',{toId:loc.id})).success,false);assert.equal((await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:move.id})).success,false);
 await assert.rejects(()=>db.vi_tri.delete({where:{id:loc.id}}));assert.equal(await stock(item.id),1);
});

test('pagination and invalid IDs are scoped and bounded at the server',async()=>{
 assert.equal((await as(manager,()=>A.getInventoryDetail(2147483648))).success,false);
 for(let i=0;i<21;i++)await newItem('TIEU_HAO',`Phân trang vật tư ${i}`);
 const first=ok(await as(manager,()=>A.getInventory({kind:'TIEU_HAO',search:'phan trang vat tu'})));
 const secondPage=ok(await as(manager,()=>A.getInventory({kind:'TIEU_HAO',search:'phan trang vat tu',page:2})));
 assert.equal(first.total,21);assert.equal(first.rows.length,20);assert.equal(secondPage.rows.length,1);assert.equal(secondPage.pages,2);
 const other=ok(await as(foreign,()=>A.getInventory({kind:'TIEU_HAO',search:'phan trang vat tu'})));assert.equal(other.total,0);
});
