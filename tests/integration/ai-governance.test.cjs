/* eslint-disable @typescript-eslint/no-require-imports -- Real PostgreSQL/auth/vault; mock only request context and provider HTTP. */
const assert = require('node:assert/strict');
const { test, before, beforeEach, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module'), fs = require('node:fs/promises'), path = require('node:path');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_ai_governance_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { askAi } = require('../../src/actions/ai.ts');
const admin = require('../../src/actions/ai-governance.ts');
const { saveAiSettings } = require('../../src/actions/ai-settings.ts');
const { aiMonth, aiMonthBounds } = require('../../src/lib/validations/ai-governance.ts');
const { aiCost } = require('../../src/lib/ai-cost.ts');
const { storeAiSecret } = require('../../src/lib/ai-secret-store.ts');
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
const prices = model => ({ version: 1, model, input: '1', cached: '0.5', output: '2' });
const json = value => new Response(JSON.stringify(value), { status: 200 });
const answer = (usage = { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 40 } }) => json({ id: 'resp_test', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Đã trả lời bằng dữ liệu kiểm thử.' }] }], usage });
let manager, role, connection, foreign, permissions, originalFetch, transport, calls;
async function makeAccount(companyId, codes) {
  const r = await db.vai_tro.create({ data: { company_id: companyId, ma_vai_tro: 'TEST_' + randomUUID(), ten_vai_tro: 'Test', danh_sach_quyen: { create: permissions.filter(p => codes.includes(`${p.phan_he}:${p.hanh_dong}`)).map(p => ({ permission_id: p.id })) } } });
  const a = await db.tai_khoan.create({ data: { company_id: companyId, ten_dang_nhap: 'governance-' + randomUUID(), ten_hien_thi: 'Người thử quản trị AI', mat_khau_bam: 'disabled', han_muc_ai_thang: '100', danh_sach_vai_tro: { create: { role_id: r.id } } } });
  return { a, r };
}
async function createConnection(companyId, model = 'test-model', isDefault = false) {
  return db.ket_noi_ai.create({ data: { company_id: companyId, ten_ket_noi: 'Kết nối thử ' + model, la_mac_dinh: isDefault, model_mac_dinh: model, cau_hinh_gia: prices(model), han_muc_chi_phi_thang: '100', tham_chieu_bi_mat: await storeAiSecret(companyId, 'sk-test-governance-secret-0000'), hau_to_khoa: '0000' } });
}
const ask = (extra = {}) => as(manager, () => askAi({ requestId: randomUUID(), message: 'Tra cứu thử', ...extra }));
const logs = () => db.nhat_ky_goi_ai.findMany({ where: { company_id: manager.company_id }, orderBy: { id: 'asc' } });
before(async () => {
  permissions = await db.quyen.findMany({ where: { OR: [{ phan_he: 'AI' }, { phan_he: { in: ['ACCOUNTS', 'ROLES', 'ASSETS', 'LOCATIONS'] }, hanh_dong: 'MANAGE' }] } });
  const dir = path.resolve('outputs/ai-governance'); await fs.mkdir(dir, { recursive: true }); process.env.AI_SECRET_STORAGE_DIR = await fs.mkdtemp(path.join(dir, 'vault-'));
  originalFetch = global.fetch; global.fetch = async (url, options) => { calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); return transport(url, options); };
});
beforeEach(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: 'Thử quản trị ' + randomUUID() } });
  const fixture = await makeAccount(company.id, permissions.map(p => `${p.phan_he}:${p.hanh_dong}`)); manager = fixture.a; role = fixture.r;
  const otherCompany = await db.cong_ty.create({ data: { ten_cong_ty: 'Công ty khác ' + randomUUID() } }); foreign = (await makeAccount(otherCompany.id, ['AI:MANAGE_CONNECTIONS','AI:VIEW_USAGE','AI:MANAGE_LIMITS'])).a;
  connection = await createConnection(company.id, 'test-model', true); process.env.AI_PILOT_ACCOUNT_ID = String(manager.id);
  calls = 0; transport = async () => answer();
});
after(async () => { global.fetch = originalFetch; await db.$disconnect(); });

test('independent admin grants, tenant boundaries and no secrets/chat in metadata', async () => {
  const limits = (await makeAccount(manager.company_id, ['AI:MANAGE_LIMITS'])).a;
  const usage = (await makeAccount(manager.company_id, ['AI:VIEW_USAGE'])).a;
  assert.equal((await as(null, admin.getAiGovernance)).success, false);
  const view = await as(limits, admin.getAiGovernance); assert(view.success); assert.equal(view.connections.length, 0); assert.equal(view.permissions.usage, false);
  assert.equal((await as(limits, () => admin.getAiUsage({ month: aiMonth() }))).success, false);
  assert.equal((await as(usage, () => admin.saveAiAccountLimit({ accountId: manager.id, version: manager.updated_at.toISOString(), limit: '10' }))).success, false);
  assert.equal((await as(foreign, () => admin.saveAiAccountLimit({ accountId: manager.id, version: manager.updated_at.toISOString(), limit: '10' }))).success, false);
  assert.equal((await as(foreign, () => admin.saveAiConnectionPolicy({ id: connection.id, version: connection.updated_at.toISOString(), limit: '1', prices: prices('test-model') }))).success, false);
  const meta = JSON.stringify(await as(manager, admin.getAiGovernance)); assert(!meta.includes('tham_chieu_bi_mat')); assert(!meta.includes('sk-test')); assert(!meta.includes('mat_khau_bam'));
});

test('job routes explicit connection and model, inherited job follows default, lookup rejects mutation tools', async () => {
  const other = await createConnection(manager.company_id, 'second-model');
  const input = { job: 'LOOKUP', version: null, connectionId: other.id, model: 'lookup-model', prices: prices('lookup-model') };
  assert((await as(manager, () => admin.saveAiJob(input))).success);
  assert.equal((await as(manager, () => admin.saveAiJob(input))).success, false);
  transport = async (_, opts) => { const body = JSON.parse(opts.body); assert.equal(body.model, 'lookup-model'); assert(body.tools.every(t => ['lookup','search_assets','get_asset'].includes(t.name))); return answer(); };
  assert((await ask({ job: 'LOOKUP' })).success);
  let row = (await logs())[0]; assert.equal(row.ket_noi_ai_id, other.id); assert.equal(row.ma_tac_vu, 'LOOKUP');
  transport = async (_, opts) => { assert.equal(JSON.parse(opts.body).model, 'test-model'); return answer(); }; assert((await ask()).success);
  transport = async () => json({ status: 'completed', output: [{ type: 'function_call', name: 'prepare_asset', arguments: '{}', call_id: 'malicious' }], usage: { input_tokens: 10, output_tokens: 1 } });
  const bad = await ask({ job: 'LOOKUP' }); assert.equal(bad.success, false); assert.match(bad.message, /không được phép/);
  assert.equal((await ask({ job: 'INVENTED' })).success, false);
});

test('reserve is durable before network, cache is not double charged, changing prices preserves ledger', async () => {
  transport = async () => { const row = (await logs())[0]; assert.equal(row.trang_thai, 'DANG_GOI'); assert(row.du_phong.gt(0)); assert.equal(row.chi_phi_uoc_tinh, null); return answer(); };
  assert((await ask()).success); const row = (await logs())[0];
  assert.equal(row.chi_phi_uoc_tinh.toString(), '0.00012'); assert.equal(row.du_phong.toString(), '0'); assert.equal(row.token_cache, 40);
  assert((await as(manager, () => admin.saveAiConnectionPolicy({ id: connection.id, version: connection.updated_at.toISOString(), limit: '50', prices: { ...prices('test-model'), input: '99' } }))).success);
  assert.deepEqual((await logs())[0], row);
  const totals = await as(manager, () => admin.getAiUsage({ month: aiMonth() })); assert(totals.success); assert.equal(totals.input, 100); assert.equal(totals.cached, 40); assert.equal(totals.cost, '0.000120');
});

test('zero, insufficient and missing-price limits block before network without resetting prior use', async () => {
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 0 } });
  assert.match((await ask()).message, /Hạn mức AI tháng/); assert.equal(calls, 0);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: '0.000001' } });
  assert.equal((await ask()).success, false); assert.equal(calls, 0);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 100 } });
  await db.ket_noi_ai.update({ where: { id: connection.id }, data: { han_muc_chi_phi_thang: 0 } });
  assert.match((await ask()).message, /Ngân sách tháng/); assert.equal(calls, 0);
  await db.ket_noi_ai.update({ where: { id: connection.id }, data: { han_muc_chi_phi_thang: 100, cau_hinh_gia: require('@prisma/client').Prisma.DbNull } });
  assert.match((await ask()).message, /bảng giá/); assert.equal(calls, 0);
});

test('timeout and absent usage retain reserve; manual reconciliation requires evidence, access and no active turn', async () => {
  transport = async () => { throw Error('network'); }; assert.equal((await ask()).success, false);
  let row = (await logs())[0]; assert.equal(row.trang_thai, 'CHUA_RO'); assert(row.du_phong.gt(0));
  assert.equal((await as(manager, () => admin.reconcileAiCall({ id: row.id, cost: '0', reason: 'Đối chiếu chưa hết thời gian' }))).success, false);
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { created_at: new Date(Date.now() - 300000) } });
  assert.equal((await as(foreign, () => admin.reconcileAiCall({ id: row.id, cost: '0', reason: 'Không đúng công ty sở hữu' }))).success, false);
  const value = { id: row.id, cost: '0.01', reason: 'Bằng chứng đối chiếu fixture chỉ đúng lần gọi này' };
  assert((await as(manager, () => admin.reconcileAiCall(value))).success); assert.equal((await as(manager, () => admin.reconcileAiCall(value))).success, false);
  row = (await logs())[0]; assert.equal(row.trang_thai, 'DOI_SOAT'); assert.equal(row.du_phong.toString(), '0'); assert.equal(row.token_dau_vao, null);
  transport = async () => answer(null); assert((await ask()).success); row = (await logs())[1]; assert.equal(row.trang_thai, 'CHUA_RO'); assert(row.du_phong.gt(0));
});

test('configuration changes and permission revocation between calls stop further network calls but keep charges', async () => {
  transport = async () => { await db.ket_noi_ai.update({ where: { id: connection.id }, data: { updated_at: new Date(connection.updated_at.getTime() + 1000) } }); return json({ status: 'completed', output: [{ type: 'function_call', name: 'lookup', arguments: '{"kind":"categories"}', call_id: 'lookup' }], usage: { input_tokens: 10, output_tokens: 2 } }); };
  assert.match((await ask()).message, /Cài đặt AI đã thay đổi/); assert.equal(calls, 1); assert.equal((await logs())[0].trang_thai, 'HOAN_TAT');
  transport = async () => { await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: permissions.find(p => p.phan_he === 'ASSETS' && p.hanh_dong === 'MANAGE').id } }); return answer(); };
  assert.equal((await ask()).success, false); // Charges survive revocation; the agent cannot continue.
  const before = calls; assert.match((await ask()).message, /chưa được mở trợ lý AI|quyền đã thay đổi/); assert.equal(calls, before);
});

test('duplicate requests never recharge and changed job under same ID is rejected', async () => {
  const input = { requestId: randomUUID(), message: 'Kiểm tra lặp' };
  const first = await ask(input); assert(first.success); assert((await ask(input)).success); assert.equal(calls, 1);
  const changed = await ask({ ...input, job: 'LOOKUP' }); assert.equal(changed.success, false); assert.equal(calls, 1);
});

test('concurrent same-account turns cannot over-admit and budget persists across key replacement', async () => {
  let release; const barrier = new Promise(resolve => { release = resolve; }); let entered; const ready = new Promise(resolve => { entered = resolve; });
  transport = async () => { entered(); await barrier; return answer(); };
  const first = ask(); await ready;
  const second = await ask(); assert.equal(second.success, false); assert.equal(calls, 1); release(); assert((await first).success);
  const before = await as(manager, admin.getMyAiUsage);
  const current = await db.ket_noi_ai.findUniqueOrThrow({ where: { id: connection.id } });
  assert((await as(manager, () => saveAiSettings({ target: current.id, name: current.ten_ket_noi, version: current.updated_at.toISOString(), model: current.model_mac_dinh, apiKey: 'sk-test-rotated-governance-1111', enabled: true }))).success);
  assert.deepEqual(await as(manager, admin.getMyAiUsage), before);
});

test('audit failure rolls back budget edits and tenant FKs reject foreign source', async () => {
  await db.$executeRawUnsafe(`CREATE FUNCTION ai_gov_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${manager.company_id} AND NEW.hanh_dong = 'AI_LIMIT' THEN RAISE EXCEPTION 'fixture'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER ai_gov_test_fail BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_gov_test_fail()');
  try { assert.equal((await as(manager, () => admin.saveAiAccountLimit({ accountId: manager.id, version: manager.updated_at.toISOString(), limit: '5' }))).success, false); }
  finally { await db.$executeRawUnsafe('DROP TRIGGER ai_gov_test_fail ON nhat_ky_hoat_dong'); await db.$executeRawUnsafe('DROP FUNCTION ai_gov_test_fail()'); }
  assert.equal((await db.tai_khoan.findUniqueOrThrow({ where: { id: manager.id } })).han_muc_ai_thang.toString(), '100');
  await assert.rejects(() => db.cau_hinh_tac_vu_ai.create({ data: { company_id: foreign.company_id, ma_tac_vu: 'GENERAL', ket_noi_ai_id: connection.id } }));
});

test('Vietnam calendar boundary and precision keep periods and cached input correct', () => {
  assert.equal(aiMonth(new Date('2026-11-30T16:59:59Z')), '2026-11'); assert.equal(aiMonth(new Date('2026-11-30T17:00:00Z')), '2026-12');
  const period = aiMonthBounds('2026-12'); assert.equal(period.gte.toISOString(), '2026-11-30T17:00:00.000Z'); assert.equal(period.lt.toISOString(), '2026-12-31T17:00:00.000Z');
  assert.equal(aiCost(prices('test'), 1, 1, 0).toString(), '0.000001');
});

test('blank account/connection budgets mean unlimited; missing prices still record tokens and unknown cost', async () => {
  assert((await as(manager, () => admin.saveAiAccountLimit({ accountId: manager.id, version: manager.updated_at.toISOString(), limit: null }))).success);
  assert((await as(manager, () => admin.saveAiConnectionPolicy({ id: connection.id, version: connection.updated_at.toISOString(), limit: null, prices: null }))).success);
  assert((await ask()).success); assert((await ask()).success);
  const row = (await logs())[0]; assert.equal(row.trang_thai, 'CHUA_GIA'); assert.equal(row.token_dau_vao, 100); assert.equal(row.chi_phi_uoc_tinh, null); assert.equal(row.du_phong, null);
  const mine = await as(manager, admin.getMyAiUsage); assert(mine.success); assert.equal(mine.limit, null); assert.equal(mine.remaining, null); assert(mine.unknown);
  const user = await db.tai_khoan.findUniqueOrThrow({ where: { id: manager.id } });
  assert((await as(manager, () => admin.saveAiAccountLimit({ accountId: manager.id, version: user.updated_at.toISOString(), limit: '100' }))).success);
  const source = await db.ket_noi_ai.findUniqueOrThrow({ where: { id: connection.id } });
  assert((await as(manager, () => admin.saveAiConnectionPolicy({ id: source.id, version: source.updated_at.toISOString(), limit: null, prices: prices('test-model') }))).success);
  const before = calls; assert.match((await ask()).message, /chưa xác định chi phí/); assert.equal(calls, before);
});
