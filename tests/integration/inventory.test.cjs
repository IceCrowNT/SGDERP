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
 const item=await newItem('TIEU_HAO','Mực máy in');ok(await record(item.id,'TON_DAU',{quantity:0}));
 assert.equal((await detail(item.id)).recorded,true);assert.equal(await stock(item.id),0);
 assert.equal((await record(item.id,'TON_DAU',{quantity:10})).success,false);
 ok(await record(item.id,'NHAP',{quantity:20}));const issue=ok(await record(item.id,'CAP_PHAT',{quantity:2,departmentId:department.id}));
 assert.equal(await stock(item.id),18);assert.equal(await outstanding(item.id),0);assert.equal((await record(item.id,'THU_HOI',{issueId:issue.id})).success,false);
 assert.equal((await record(item.id,'CAP_PHAT',{employeeId:person.id,departmentId:department.id})).success,false);
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

test('catalog versioning, editable unit and frozen kind/code, stop lifecycle and location/department history',async()=>{
 const item=await newItem();ok(await record(item.id,'NHAP',{quantity:1,toId:place.id}));
 const v={id:item.id,version:item.updated_at.toISOString(),name:'Updated',categoryId:item.loai_vat_tu_id,unit:item.don_vi_tinh,minimum:0,departmentId:item.phong_quan_ly_id,notes:'',active:true};
 const saved=ok(await as(manager,()=>A.saveInventoryItem(v)));assert.equal((await as(manager,()=>A.saveInventoryItem(v))).success,false);
 const renamed=ok(await as(manager,()=>A.saveInventoryItem({...v,version:saved.row.updated_at.toISOString(),unit:'chiếc'})));
 assert.equal(renamed.row.don_vi_tinh,'chiếc');assert.equal(await stock(item.id),1);
 v.version=renamed.row.updated_at.toISOString();v.unit='chiếc';
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,active:false}))).success,false);
 await assert.rejects(()=>db.mat_hang_vat_tu.update({where:{id:item.id},data:{loai_vat_tu_id:consumable.id}}),/không đổi mã hoặc hạng mục/);
 await assert.rejects(()=>db.vi_tri.update({where:{id:place.id},data:{dang_su_dung:false}}),/còn tồn/);
 await assert.rejects(()=>db.vi_tri.delete({where:{id:place.id}}));await assert.rejects(()=>db.phong_ban.delete({where:{id:department.id}}));
 ok(await record(item.id,'DIEU_CHINH_GIAM',{quantity:1,fromId:place.id}));ok(await as(manager,()=>A.saveInventoryItem({...v,active:false})));
});

test('audit failure rolls back ledger and stock, not just log',async()=>{
 const item=await newItem();
 await db.$executeRawUnsafe(`CREATE FUNCTION test_inventory_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.phan_he='INVENTORY' AND NEW.doi_tuong_id LIKE 'giao_dich_vat_tu:%' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
 await db.$executeRawUnsafe('CREATE TRIGGER test_inventory_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_inventory_audit_failure()');
 try{assert.equal((await record(item.id,'NHAP',{quantity:5,toId:place.id})).success,false);assert.equal(await stock(item.id),0);assert.equal((await detail(item.id)).recorded,false);}finally{await db.$executeRawUnsafe('DROP TRIGGER test_inventory_audit_failure ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION test_inventory_audit_failure()');}
});

test('unaccented server search, low stock uses company total even when filtering one place',async()=>{
 const item=await newItem('PHU_KIEN','Giấy trắng đặc biệt');ok(await record(item.id,'NHAP',{quantity:10,toId:place.id}));ok(await record(item.id,'CHUYEN_NOI_GIU',{quantity:1,fromId:place.id,toId:second.id}));
 const result=ok(await as(manager,()=>A.getInventory({kind:'PHU_KIEN',search:'giay dac',locationId:second.id})));assert.equal(result.rows.length,1);assert.equal(result.rows[0].stock,1);assert.equal(result.rows[0].totalStock,10);assert.equal(result.rows[0].low,false);
 const low=ok(await as(manager,()=>A.getInventory({kind:'PHU_KIEN',search:'giay dac',locationId:second.id,low:true})));assert.equal(low.rows.length,0);
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


test('pooled creation is atomic, idempotent and separates units from quantity', async()=>{
 const v={name:'Mực 140g pooled',categoryId:consumable.id,unit:'lọ',minimum:2,departmentId:department.id,notes:'',active:true,initialQuantity:20,initialRequestId:randomUUID()};
 const results=await Promise.all([as(manager,()=>A.saveInventoryItem(v)),as(manager,()=>A.saveInventoryItem(v))]);results.forEach(ok);
 assert.equal(results[0].row.id,results[1].row.id);const id=results[0].row.id;
 assert.equal(await stock(id),20);assert.equal(await db.giao_dich_vat_tu.count({where:{mat_hang_vat_tu_id:id}}),1);
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,initialQuantity:21}))).success,false);
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,unit:'20',initialRequestId:randomUUID()}))).success,false);
 assert.equal((await as(viewer,()=>A.saveInventoryItem({...v,initialRequestId:randomUUID()}))).success,false);
 const prior=await db.mat_hang_vat_tu.count({where:{company_id:company.id}});
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,active:false,initialRequestId:randomUUID()}))).success,false);
 assert.equal(await db.mat_hang_vat_tu.count({where:{company_id:company.id}}),prior);
});
test('pooled stock rejects positions, duplicate opening, SQL negative and competing uses',async()=>{
 const item=await newItem('TIEU_HAO','Mực tồn chung');
 assert.equal((await record(item.id,'NHAP',{quantity:20,toId:place.id})).success,false);
 ok(await record(item.id,'NHAP',{quantity:20}));
 assert.deepEqual((await detail(item.id)).stock.map(r=>[r.locationId,r.quantity]),[[null,20]]);
 const p=await payload(item.id,'CAP_PHAT',{quantity:12,departmentId:department.id});
 const r=await Promise.all([as(manager,()=>A.recordInventoryTransaction(p)),as(manager,()=>A.recordInventoryTransaction({...p,requestId:randomUUID()}))]);assert.equal(r.filter(x=>x.success).length,1);assert.equal(await stock(item.id),8);
 ok(await as(manager,()=>A.recordInventoryTransaction(p)));assert.equal(await stock(item.id),8);
 assert.equal((await record(item.id,'TON_DAU',{quantity:1})).success,false);
 await assert.rejects(()=>db.giao_dich_vat_tu.create({data:{company_id:company.id,mat_hang_vat_tu_id:item.id,loai_giao_dich:'CAP_PHAT',so_luong:9,phong_ban_nhan_id:department.id,account_id:manager.id,request_id:randomUUID()}}),/vượt tồn/);
 const used=r.find(x=>x.success);ok(await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:used.id}));assert.equal(await stock(item.id),20);
 assert.equal((await record(item.id,'DAO_GIAO_DICH',{quantity:0,reversalId:used.id})).success,false);
 const list=ok(await as(manager,()=>A.getInventory({kind:'TIEU_HAO',search:'Mực tồn chung',locationId:place.id})));assert.equal(list.rows[0].stock,20);
});

const W=require('../../src/actions/workflow.ts');
let requester, ticketTemplate;
async function ticketSetup(){
 const wf=await db.quyen.findMany({where:{phan_he:'WORKFLOW'}});
 await db.vai_tro_quyen.createMany({data:wf.map(p=>({role_id:role.id,permission_id:p.id})),skipDuplicates:true});
 await db.tai_khoan.update({where:{id:manager.id},data:{employee_id:person.id}});
 const rp=await db.nhan_su.create({data:{company_id:company.id,department_id:department.id,ho_ten:'Người yêu cầu hỗ trợ',tinh_trang_lam_viec:'ACTIVE'}});
 const rr=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'TICKET_REQUESTER',ten_vai_tro:'Gửi yêu cầu',danh_sach_quyen:{create:wf.filter(p=>['VIEW','CREATE'].includes(p.hanh_dong)).map(p=>({permission_id:p.id}))}}});
 requester=await db.tai_khoan.create({data:{company_id:company.id,employee_id:rp.id,ten_dang_nhap:`ticket-${randomUUID()}`,ten_hien_thi:'Người gửi',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:rr.id}}}});
 const t=ok(await as(manager,()=>W.saveWorkflowTemplate({code:'SUPPORT_IT',name:'Hỗ trợ IT',description:'',steps:[{name:'IT xác nhận hoàn thành',instructions:'',kind:'TASK',assignment:'SPECIFIC_EMPLOYEE',employeeId:person.id}]})));
 ticketTemplate=t.id;
 const workspace=ok(await as(manager,W.getWorkflowWorkspace));const template=workspace.templates.find(t=>t.id===ticketTemplate);
 ok(await as(manager,()=>W.changeWorkflowTemplate({id:ticketTemplate,version:template.version,command:'PUBLISH'})));
}
const wd=async id=>ok(await as(manager,()=>W.getWorkflowDetail(id)));
async function ticket(){
 const saved=ok(await as(requester,()=>W.saveWorkflowDraft({templateId:ticketTemplate,title:'Đổ mực phòng kinh doanh',content:'Kiểm tra và thay mực'})));
 const id=saved.id;const d=await wd(id);
 ok(await as(requester,()=>W.actOnWorkflow({id,version:d.record.version,command:'SUBMIT',reason:''})));return id;
}
async function lines(id,rows){return as(manager,async()=>W.saveWorkflowMaterials({id,version:(await wd(id)).record.version,lines:rows}));}
async function finishPayload(id){const d=await wd(id);return {id,version:d.record.version,stepId:d.record.steps.find(s=>s.status==='PENDING').id,command:'COMPLETE',reason:'Đã đổ mực'};}

test('ticket draft does not consume; completion atomically consumes once and links history',async()=>{
 await ticketSetup();const item=await newItem('TIEU_HAO','Mực ticket');ok(await record(item.id,'NHAP',{quantity:20}));
 const id=await ticket();ok(await lines(id,[{itemId:item.id,departmentId:department.id,quantity:2}]));assert.equal(await stock(item.id),20);
 const d=await wd(id);assert.equal(d.materials.length,1);assert(d.canEditMaterials);
 const p=await finishPayload(id);const results=await Promise.all([as(manager,()=>W.actOnWorkflow(p)),as(manager,()=>W.actOnWorkflow(p))]);assert.equal(results.filter(x=>x.success).length,1);
 assert.equal(await stock(item.id),18);assert.equal((await wd(id)).record.status,'COMPLETED');assert.equal((await wd(id)).canEditMaterials,false);
 const moves=(await detail(item.id)).history.filter(h=>h.dong_vat_tu);assert.equal(moves.length,1);assert.equal(moves[0].dong_vat_tu.ho_so.id,id);
 assert.equal((await lines(id,[])).success,false);
 await assert.rejects(()=>db.dong_vat_tu_quy_trinh.update({where:{id:d.materials[0].id},data:{so_luong:3}}),/chỉ sửa vật tư/);
 assert.equal((await as(foreign,()=>W.getWorkflowDetail(id))).success,false);
});
test('ticket insufficient second line rolls back first issue, final step and history; permission is rechecked',async()=>{
 const a=await newItem('TIEU_HAO','Mực đủ'),b=await newItem('TIEU_HAO','Cartridge thiếu');ok(await record(a.id,'NHAP',{quantity:20}));ok(await record(b.id,'NHAP',{quantity:1}));
 const id=await ticket();const rows=[{itemId:a.id,departmentId:department.id,quantity:2},{itemId:b.id,departmentId:department.id,quantity:2}];
 assert.equal((await as(requester,async()=>W.saveWorkflowMaterials({id,version:(await wd(id)).record.version,lines:rows}))).success,false);
 ok(await lines(id,rows));const p=await finishPayload(id);const before=(await wd(id)).record.history.length;
 const failed=await as(manager,()=>W.actOnWorkflow(p));assert.equal(failed.success,false);assert.match(failed.message,/vượt tồn/);
 assert.equal(await stock(a.id),20);assert.equal(await stock(b.id),1);assert.equal((await wd(id)).record.status,'IN_PROGRESS');assert.equal((await wd(id)).record.history.length,before);
 ok(await record(b.id,'NHAP',{quantity:1}));
 await db.vai_tro_quyen.delete({where:{role_id_permission_id:{role_id:role.id,permission_id:grant.id}}});
 try{assert.equal((await as(manager,()=>W.actOnWorkflow(p))).success,false);assert.equal(await db.giao_dich_vat_tu.count({where:{dong_vat_tu:{ho_so_quy_trinh_id:id}}}),0);}finally{await db.vai_tro_quyen.create({data:{role_id:role.id,permission_id:grant.id}});}
 ok(await as(manager,()=>W.actOnWorkflow(p)));assert.equal(await stock(a.id),18);assert.equal(await stock(b.id),0);
});
test('cancelled tickets retain planned material lines without posting or allowing edits',async()=>{
 const item=await newItem('TIEU_HAO','Mực hủy');ok(await record(item.id,'NHAP',{quantity:5}));const id=await ticket();ok(await lines(id,[{itemId:item.id,departmentId:department.id,quantity:2}]));
 ok(await as(manager,async()=>W.actOnWorkflow({id,version:(await wd(id)).record.version,command:'CANCEL',reason:'Không thực hiện'})));
 assert.equal(await stock(item.id),5);assert.equal((await wd(id)).materials.length,1);assert.equal((await lines(id,[])).success,false);
});

test('intermediate task completion leaves planned stock untouched until the final step',async()=>{
 const t=ok(await as(manager,()=>W.saveWorkflowTemplate({code:'SUPPORT_MULTI',name:'Hỗ trợ nhiều bước',description:'',steps:[1,2].map(n=>({name:`IT bước ${n}`,instructions:'',kind:'TASK',assignment:'SPECIFIC_EMPLOYEE',employeeId:person.id}))})));
 const info=ok(await as(manager,W.getWorkflowWorkspace)).templates.find(x=>x.id===t.id);
 ok(await as(manager,()=>W.changeWorkflowTemplate({id:t.id,version:info.version,command:'PUBLISH'})));
 const previous=ticketTemplate;ticketTemplate=t.id;const id=await ticket();ticketTemplate=previous;
 const item=await newItem('TIEU_HAO','Mực nhiều bước');ok(await record(item.id,'NHAP',{quantity:20}));ok(await lines(id,[{itemId:item.id,departmentId:department.id,quantity:2}]));
 ok(await as(manager,async()=>W.actOnWorkflow(await finishPayload(id))));assert.equal(await stock(item.id),20);assert.equal((await wd(id)).record.status,'IN_PROGRESS');
 ok(await as(manager,async()=>W.actOnWorkflow(await finishPayload(id))));assert.equal(await stock(item.id),18);assert.equal((await wd(id)).record.status,'COMPLETED');
});

test('legacy located consumables retain rows and total after pooled function upgrade',async()=>{
 const fs=require('node:fs');
 const old=fs.readFileSync('prisma/migrations/20261117090000_vat_tu_va_phu_kien/migration.sql','utf8');
 const upgraded=fs.readFileSync('prisma/migrations/20261118090000_ton_chung_tieu_hao/migration.sql','utf8');
 const fn=(source,name)=>source.match(new RegExp('CREATE (?:OR REPLACE )?FUNCTION '+name+'[\\s\\S]*?\\$\\$;'))[0].replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION');
 const stop=new Error('rollback fixture');
 try{await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe(fn(old,'ton_vat_tu'));await tx.$executeRawUnsafe(fn(old,'bao_ve_giao_dich_vat_tu'));
   const item=await tx.mat_hang_vat_tu.create({data:{company_id:company.id,loai_vat_tu_id:consumable.id,ten_mat_hang:'Legacy mực',don_vi_tinh:'lọ'}});
   const common={company_id:company.id,mat_hang_vat_tu_id:item.id,account_id:manager.id};
   await tx.giao_dich_vat_tu.create({data:{...common,request_id:randomUUID(),loai_giao_dich:'NHAP',so_luong:20,vi_tri_nhap_id:place.id}});
   await tx.giao_dich_vat_tu.create({data:{...common,request_id:randomUUID(),loai_giao_dich:'CHUYEN_NOI_GIU',so_luong:5,vi_tri_xuat_id:place.id,vi_tri_nhap_id:second.id}});
   await tx.giao_dich_vat_tu.create({data:{...common,request_id:randomUUID(),loai_giao_dich:'CAP_PHAT',so_luong:2,vi_tri_xuat_id:second.id,phong_ban_nhan_id:department.id}});
   const before=await tx.giao_dich_vat_tu.findMany({where:{mat_hang_vat_tu_id:item.id}});
   await tx.$executeRawUnsafe(fn(upgraded,'ton_vat_tu'));await tx.$executeRawUnsafe(fn(upgraded,'bao_ve_giao_dich_vat_tu'));
   assert.deepEqual(await tx.$queryRaw`SELECT * FROM ton_vat_tu(${item.id}::int)`,[{vi_tri_id:null,so_luong:18n}]);
   assert.deepEqual(await tx.giao_dich_vat_tu.findMany({where:{mat_hang_vat_tu_id:item.id}}),before);
   await tx.giao_dich_vat_tu.create({data:{...common,request_id:randomUUID(),loai_giao_dich:'CAP_PHAT',so_luong:2,phong_ban_nhan_id:department.id}});
   assert.deepEqual(await tx.$queryRaw`SELECT * FROM ton_vat_tu(${item.id}::int)`,[{vi_tri_id:null,so_luong:16n}]);throw stop;
 },{timeout:20000});}catch(e){if(e!==stop)throw e;}
});


test('unit label correction after consumption preserves ledger, balances and audit; permissions and version remain enforced',async()=>{
 const item=await db.mat_hang_vat_tu.create({data:{company_id:company.id,loai_vat_tu_id:consumable.id,ten_mat_hang:'Legacy numeric unit',don_vi_tinh:'20'}});
 ok(await record(item.id,'NHAP',{quantity:20}));ok(await record(item.id,'CAP_PHAT',{quantity:2,departmentId:department.id}));
 const ledger=await db.giao_dich_vat_tu.findMany({where:{mat_hang_vat_tu_id:item.id},orderBy:{id:'asc'}});
 const v={id:item.id,version:item.updated_at.toISOString(),name:item.ten_mat_hang,categoryId:consumable.id,unit:'lọ',minimum:null,departmentId:null,notes:'',active:true};
 for(const actor of [null,viewer,none,foreign]) assert.equal((await as(actor,()=>A.saveInventoryItem(v))).success,false);
 for(const unit of ['', '   ', '20']) assert.equal((await as(manager,()=>A.saveInventoryItem({...v,unit}))).success,false);
 const saved=ok(await as(manager,()=>A.saveInventoryItem(v)));
 assert.equal(saved.row.don_vi_tinh,'lọ');assert.equal(await stock(item.id),18);
 assert.deepEqual(await db.giao_dich_vat_tu.findMany({where:{mat_hang_vat_tu_id:item.id},orderBy:{id:'asc'}}),ledger);
 const log=await db.nhat_ky_hoat_dong.findFirstOrThrow({where:{company_id:company.id,phan_he:'INVENTORY',doi_tuong_id:`mat_hang_vat_tu:${item.id}`},orderBy:{id:'desc'}});
 assert.equal(log.du_lieu_cu.don_vi_tinh,'20');assert.equal(log.du_lieu_moi.don_vi_tinh,'lọ');
 assert.equal((await as(manager,()=>A.saveInventoryItem({...v,unit:'chai'}))).success,false);
 assert.equal((await detail(item.id)).row.don_vi_tinh,'lọ');
});
