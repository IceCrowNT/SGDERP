/* eslint-disable @typescript-eslint/no-require-imports -- Real DB/actions/auth; only Next request context and OpenAI transport are simulated. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_(?:ai(?:_keys)?|system_settings)_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { askAi } = require('../../src/actions/ai.ts');
const { prepareCategoryDepreciationWork: prepare, approveAiWork: approve, refreshAiWork: refresh, cancelAiWork: cancel, getAiWork: get, listAiWorks: list } = require('../../src/actions/ai-work.ts');
const { AI_PILOT_TOOLS } = require('../../src/lib/ai-pilot-tools.ts');
const plan = (months = 60, requestId = randomUUID()) => as(manager, () => prepare({ months, requestId, scope: 'all_categories' }));
const ref = work => ({ id: work.id, version: work.version });
const originalFetch = global.fetch;
let manager, other, viewer, category, asset, location, foreignAsset, role, grant;
let responses = [];
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
const ask = (account, overrides = {}) => as(account, () => askAi({ requestId: randomUUID(), message: 'Yêu cầu thử nghiệm', ...overrides }));
const response = output => new Response(JSON.stringify({ id: 'resp_test', status: 'completed', output, usage: { input_tokens: 100, output_tokens: 30, input_tokens_details: { cached_tokens: 20 } } }), { status: 200 });
const tool = (name, args) => response([{ type: 'function_call', name, arguments: JSON.stringify(args), call_id: randomUUID() }]);
const reply = text => response([{ type: 'message', content: [{ type: 'output_text', text }] }]);
before(async () => {
  process.env.OPENAI_API_KEY = 'test-only-no-network'; process.env.OPENAI_MODEL = 'test-model';
  const run = randomUUID().slice(0, 8);
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `AI test ${run}` } });
  const permissions = await db.quyen.findMany({ where: { phan_he: { in: ['ROLES','ACCOUNTS','ASSETS','LOCATIONS'] }, hanh_dong: 'MANAGE', pham_vi: 'ALL' } });
  assert.equal(permissions.length, 4);
  grant = permissions.find(p => p.phan_he === 'ASSETS');
  role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: 'AI_TEST', ten_vai_tro: 'Pilot', danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  for (const name of ['manager','other','viewer']) {
    const account = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `ai-${name}-${run}`, ten_hien_thi: name, mat_khau_bam: 'disabled', ...(name !== 'viewer' ? { danh_sach_vai_tro: { create: { role_id: role.id } } } : {}) } });
    if (name === 'manager') manager = account; else if (name === 'other') other = account; else viewer = account;
  }
  process.env.AI_PILOT_ACCOUNT_ID = String(manager.id);
  category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'PRINTER', ten_loai: 'Máy in' } });
  location = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: 'HCNS thử', loai_vi_tri: 'PHONG' } });
  asset = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Máy in cũ', vi_tri_id: location.id, so_serial: 'KEEP-SERIAL', ghi_chu: 'KEEP-NOTES', gia_mua: '12000000', thoi_gian_khau_hao_thang: 36 } });
  const foreignCompany = await db.cong_ty.create({ data: { ten_cong_ty: `Other AI ${run}` } });
  const foreignCategory = await db.loai_tai_san.create({ data: { company_id: foreignCompany.id, ma_loai: 'PC', ten_loai: 'PC' } });
  foreignAsset = await db.tai_san.create({ data: { company_id: foreignCompany.id, loai_tai_san_id: foreignCategory.id, ten_tai_san: 'SECRET-FOREIGN' } });
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.parallel_tool_calls, false);
    assert(!JSON.stringify(body).includes('test-only-no-network'));
    const next = responses.shift(); assert(next, 'Unexpected API call');
    return typeof next === 'function' ? next(body) : next;
  };
});
after(async () => { global.fetch = originalFetch; await db.$disconnect(); });


test('server snapshots all categories including inactive beyond lookup limit, without updating assets/categories', async () => {
  await db.loai_tai_san.createMany({data:Array.from({length:52},(_,i)=>({company_id:manager.company_id,ma_loai:`EXTRA${i}`,ten_loai:`Loại ${i}`,dang_su_dung:i!==0,khau_hao_mac_dinh_thang:i===1?60:36}))});
  const before=await db.loai_tai_san.findMany({where:{company_id:manager.company_id},orderBy:{id:'asc'}});
  const requestId=randomUUID(), result=await plan(60,requestId);assert(result.success,result.message);
  assert.equal(result.work.snapshot.rows.length,53);assert(result.work.snapshot.rows.some(r=>!r.active));assert.equal(result.work.status,'CHO_DUYET');
  assert.deepEqual(await db.loai_tai_san.findMany({where:{company_id:manager.company_id},orderBy:{id:'asc'}}),before);
  assert.deepEqual((await plan(60,requestId)).work,result.work);assert.equal((await plan(48,requestId)).success,false);
  assert.equal((await as(manager,()=>get({id:result.work.id}))).work.id,result.work.id);
  assert((await as(manager,()=>list())).works.some(w=>w.id===result.work.id));
  for(const months of [0,1201,1.5])assert.equal((await plan(months)).success,false);
});

test('only bound owner can read/approve and strict inputs reject a supplied replacement snapshot', async()=>{
  const {work}=await plan();
  for(const account of [null,other,viewer]) assert.equal((await as(account,()=>approve(ref(work)))).success,false);
  process.env.AI_PILOT_ACCOUNT_ID=String(other.id);
  assert.equal((await as(other,()=>get({id:work.id}))).success,false);
  assert.equal((await as(other,()=>approve(ref(work)))).success,false);
  assert.equal((await as(other,()=>list())).works.length,0);
  process.env.AI_PILOT_ACCOUNT_ID=String(manager.id);
  assert.equal((await as(manager,()=>approve({...ref(work),months:1}))).success,false);
  assert.equal((await as(manager,()=>approve({...ref(work),companyId:foreignAsset.company_id}))).success,false);
  assert.equal((await db.loai_tai_san.findUniqueOrThrow({where:{id:category.id}})).khau_hao_mac_dinh_thang,null);
});

test('changed field, changed category set and old version cannot execute; refresh needs explicit new approval',async()=>{
  const {work}=await plan();
  await db.loai_tai_san.update({where:{id:category.id},data:{ten_loai:'Máy in đã sửa'}});
  const stale=await as(manager,()=>approve(ref(work)));assert(stale.success);assert.equal(stale.work.status,'CAN_LAM_MOI');
  assert.equal((await db.loai_tai_san.findUniqueOrThrow({where:{id:category.id}})).khau_hao_mac_dinh_thang,null);
  const fresh=await as(manager,()=>refresh(ref(work)));assert(fresh.success);assert.equal(fresh.work.version,2);assert.equal(fresh.work.status,'CHO_DUYET');
  assert.equal((await as(manager,()=>approve(ref(work)))).success,false);
  const extra=await db.loai_tai_san.create({data:{company_id:manager.company_id,ma_loai:'ADDED',ten_loai:'Loại thêm sau'}});
  assert.equal((await as(manager,()=>approve(ref(fresh.work)))).work.status,'CAN_LAM_MOI');
  await db.loai_tai_san.delete({where:{id:extra.id}});
  assert.equal((await as(manager,()=>approve(ref(fresh.work)))).work.status,'CAN_LAM_MOI');
  assert.equal((await as(manager,()=>cancel(ref(fresh.work)))).work.status,'DA_HUY');
  assert.equal((await as(manager,()=>approve(ref(fresh.work)))).success,false);
});

test('revoked permission between preparation and approval denies without writing',async()=>{
  const {work}=await plan();
  await db.vai_tro_quyen.delete({where:{role_id_permission_id:{role_id:role.id,permission_id:grant.id}}});
  assert.equal((await as(manager,()=>approve(ref(work)))).success,false);
  assert.equal((await as(manager,()=>list())).success,false);
  await db.vai_tro_quyen.create({data:{role_id:role.id,permission_id:grant.id}});
  assert.equal((await db.cong_viec_ai.findUniqueOrThrow({where:{id:work.id}})).trang_thai,'CHO_DUYET');
});

test('audit failure rolls back whole batch and approval status; retry succeeds once even concurrently',async()=>{
  const {work}=await plan();
  const before=await db.loai_tai_san.findMany({where:{company_id:manager.company_id},orderBy:{id:'asc'}});
  const beforeAsset=await db.tai_san.findUniqueOrThrow({where:{id:asset.id}});
  await db.$executeRawUnsafe(`CREATE FUNCTION ai_work_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.phan_he = 'ASSETS' AND NEW.mo_ta LIKE 'Duyệt công việc AI #${work.id}:%' THEN RAISE EXCEPTION 'test audit rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER ai_work_test_fail_trigger BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_work_test_fail()');
  try { assert.equal((await as(manager,()=>approve(ref(work)))).success,false); }
  finally {await db.$executeRawUnsafe('DROP TRIGGER ai_work_test_fail_trigger ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION ai_work_test_fail()');}
  assert.deepEqual(await db.loai_tai_san.findMany({where:{company_id:manager.company_id},orderBy:{id:'asc'}}),before);
  assert.equal((await db.cong_viec_ai.findUniqueOrThrow({where:{id:work.id}})).trang_thai,'CHO_DUYET');
  const results=await Promise.all([as(manager,()=>approve(ref(work))),as(manager,()=>approve(ref(work)))]);
  for(const result of results){assert(result.success,result.message);assert.equal(result.work.status,'HOAN_TAT');assert.deepEqual(result.work.result,{changed:52,unchanged:1});}
  assert.deepEqual(await db.tai_san.findUniqueOrThrow({where:{id:asset.id}}),beforeAsset);
  assert.equal((await db.loai_tai_san.findMany({where:{company_id:manager.company_id,khau_hao_mac_dinh_thang:{not:60}}})).length,0);
  assert.equal(await db.nhat_ky_hoat_dong.count({where:{doi_tuong_id:`cong_viec_ai:${work.id}`,hanh_dong:'AI_WORK_APPROVE'}}),1);
  assert.equal(await db.nhat_ky_hoat_dong.count({where:{company_id:manager.company_id,phan_he:'ASSETS',mo_ta:{startsWith:`Duyệt công việc AI #${work.id}:`}}}),52);
  assert.equal((await as(manager,()=>cancel(ref(work)))).success,false);
  assert.equal((await as(manager,()=>refresh(ref(work)))).success,false);
  const foreign=await db.loai_tai_san.findUniqueOrThrow({where:{id:foreignAsset.loai_tai_san_id}});assert.equal(foreign.khau_hao_mac_dinh_thang,null);
});

test('no-op has no approve; cancellation is persistent, idempotent and never writes categories',async()=>{
  const noop=await plan();assert(noop.success);assert.equal(noop.work.status,'KHONG_CAN_DOI');assert.deepEqual(noop.work.result,{changed:0,unchanged:53});
  assert.equal((await as(manager,()=>approve(ref(noop.work)))).success,false);
  const {work}=await plan(48);assert.equal((await as(manager,()=>cancel(ref(work)))).work.status,'DA_HUY');
  assert.equal((await as(manager,()=>cancel(ref(work)))).work.status,'DA_HUY');
  assert.equal((await as(manager,()=>get({id:work.id}))).work.status,'DA_HUY');
  assert.equal((await db.loai_tai_san.findUniqueOrThrow({where:{id:category.id}})).khau_hao_mac_dinh_thang,60);
});

test('chat tool returns persisted work and cannot approve it through model tools',async()=>{
  assert(!AI_PILOT_TOOLS.some(t=>/approve|execute|cancel/.test(t.name)));
  responses=[tool('plan_category_depreciation',{months:48,scope:'all_categories'})];
  const result=await ask(manager);assert(result.success,result.message);assert.equal(result.draft,null);assert.equal(result.work.status,'CHO_DUYET');
  assert.equal((await db.loai_tai_san.findUniqueOrThrow({where:{id:category.id}})).khau_hao_mac_dinh_thang,60);
  responses=[tool('approveAiWork',ref(result.work)),reply('Cần duyệt trên bảng.')];assert((await ask(manager)).success);
  assert.equal((await as(manager,()=>get({id:result.work.id}))).work.status,'CHO_DUYET');
});

test('work list recovers with pagination, tenant/account FK and status checks enforced',async()=>{
  for(let i=0;i<11;i++)assert((await plan(24)).success);
  const page=await as(manager,()=>list());assert.equal(page.works.length,10);assert(page.nextCursor);
  const next=await as(manager,()=>list({beforeId:page.nextCursor}));assert(next.works.length>0);assert(!next.works.some(w=>page.works.some(p=>p.id===w.id)));
  const row=await db.cong_viec_ai.findUniqueOrThrow({where:{id:page.works[0].id}});
  await assert.rejects(db.cong_viec_ai.create({data:{company_id:foreignAsset.company_id,account_id:manager.id,ma_yeu_cau:randomUUID(),loai_cong_viec:'KHAU_HAO_LOAI',noi_dung:row.noi_dung}}));
  await assert.rejects(db.cong_viec_ai.update({where:{id:row.id},data:{trang_thai:'HOAN_TAT'}}));
});
