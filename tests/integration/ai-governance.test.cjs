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
  transport = async (_, opts) => { const body = JSON.parse(opts.body); assert.equal(body.model, 'lookup-model'); assert(body.tools.every(t => ['lookup','search_assets','get_asset','read_ai_attachment','analyze_ai_sheet','read_pdf_page','search_chat_history'].includes(t.name))); return answer(); };
  assert((await ask({ job: 'LOOKUP' })).success);
  let row = (await logs())[0]; assert.equal(row.ket_noi_ai_id, other.id); assert.equal(row.ma_tac_vu, 'LOOKUP');
  transport = async (_, opts) => { assert.equal(JSON.parse(opts.body).model, 'test-model'); return answer(); }; assert((await ask()).success);
  transport = async () => json({ status: 'completed', output: [{ type: 'function_call', name: 'prepare_asset', arguments: '{}', call_id: 'malicious' }], usage: { input_tokens: 10, output_tokens: 1 } });
  const bad = await ask({ job: 'LOOKUP' }); assert.equal(bad.success, false); assert.match(bad.message, /không được phép/);
  assert.equal((await ask({ job: 'INVENTED' })).success, false);
});

test('usage log is durable before network, cache is not double charged, changing prices preserves ledger', async () => {
  transport = async () => { const row = (await logs())[0]; assert.equal(row.trang_thai, 'DANG_GOI'); assert.equal(row.du_phong, null); assert.equal(row.chi_phi_uoc_tinh, null); return answer(); };
  assert((await ask()).success); const row = (await logs())[0];
  assert.equal(row.chi_phi_uoc_tinh.toString(), '0.00012'); assert.equal(row.du_phong.toString(), '0'); assert.equal(row.token_cache, 40);
  assert((await as(manager, () => admin.saveAiConnectionPolicy({ id: connection.id, version: connection.updated_at.toISOString(), limit: '50', prices: { ...prices('test-model'), input: '99' } }))).success);
  assert.deepEqual((await logs())[0], row);
  const totals = await as(manager, () => admin.getAiUsage({ month: aiMonth() })); assert(totals.success); assert.equal(totals.input, 100); assert.equal(totals.cached, 40); assert.equal(totals.cost, '0.000120');
});

test('zero limits block before network and positive budgets ignore estimates', async () => {
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 0 } });
  assert.match((await ask()).message, /Hạn mức AI tháng/); assert.equal(calls, 0);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: '0.000001' } });
  assert((await ask()).success); assert((await ask()).success); assert.equal(calls, 2);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 100 } });
  await db.ket_noi_ai.update({ where: { id: connection.id }, data: { han_muc_chi_phi_thang: 0 } });
  assert.match((await ask()).message, /Ngân sách tháng/); assert.equal(calls, 2);
});

test('unpriced calls with budgets record tokens until known spend exhausts either budget', async () => {
  // The connection has prices for its default model. A different job model has none.
  assert((await as(manager, () => admin.saveAiJob({ job: 'GENERAL', version: null, connectionId: connection.id, model: 'unpriced-model', prices: null }))).success);
  assert((await ask()).success);
  const [row] = await logs();
  assert.equal(row.model, 'unpriced-model');
  assert.equal(row.trang_thai, 'CHUA_GIA');
  assert.equal(row.token_dau_vao, 100);
  assert.equal(row.token_dau_ra, 20);
  assert.equal(row.token_cache, 40);
  assert.equal(row.du_phong, null);
  assert.equal(row.chi_phi_uoc_tinh, null);
  assert((await ask()).success);
  const summary = await as(manager, admin.getMyAiUsage);
  assert(summary.success && summary.unknown);
  assert.equal(summary.remaining, '100.000000');

  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { created_at: new Date(Date.now() - 300000) } });
  assert((await as(manager, () => admin.reconcileAiCall({ id: row.id, cost: '100', reason: 'Đối chiếu chi phí kỳ thử nghiệm' }))).success);
  assert.match((await ask()).message, /Hạn mức AI tháng/);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: null } });
  assert.match((await ask()).message, /Ngân sách tháng/);
  assert.equal(calls, 2);
});

test('timeout and absent usage keep unknown cost; manual reconciliation requires evidence, access and no active turn', async () => {
  transport = async () => { throw Error('network'); }; assert.equal((await ask()).success, false);
  let row = (await logs())[0]; assert.equal(row.trang_thai, 'CHUA_RO'); assert.equal(row.du_phong, null);
  assert.equal((await as(manager, () => admin.reconcileAiCall({ id: row.id, cost: '0', reason: 'Đối chiếu chưa hết thời gian' }))).success, false);
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { created_at: new Date(Date.now() - 300000) } });
  assert.equal((await as(foreign, () => admin.reconcileAiCall({ id: row.id, cost: '0', reason: 'Không đúng công ty sở hữu' }))).success, false);
  const value = { id: row.id, cost: '0.01', reason: 'Bằng chứng đối chiếu fixture chỉ đúng lần gọi này' };
  assert((await as(manager, () => admin.reconcileAiCall(value))).success); assert.equal((await as(manager, () => admin.reconcileAiCall(value))).success, false);
  row = (await logs())[0]; assert.equal(row.trang_thai, 'DOI_SOAT'); assert.equal(row.du_phong.toString(), '0'); assert.equal(row.token_dau_vao, null);
  transport = async () => answer(null); assert((await ask()).success); row = (await logs())[1]; assert.equal(row.trang_thai, 'CHUA_RO'); assert.equal(row.du_phong, null);
});

test('connection changes stop a turn; revoking ERP grants preserves generic chat and charges', async () => {
  transport = async () => { await db.ket_noi_ai.update({ where: { id: connection.id }, data: { model_mac_dinh: 'changed-model' } }); return json({ status: 'completed', output: [{ type: 'function_call', name: 'lookup', arguments: '{"kind":"categories"}', call_id: 'lookup' }], usage: { input_tokens: 10, output_tokens: 2 } }); };
  assert.match((await ask()).message, /Cài đặt AI đã thay đổi/); assert.equal(calls, 1); assert.equal((await logs())[0].trang_thai, 'HOAN_TAT');
  transport = async () => { await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: permissions.find(p => p.phan_he === 'ASSETS' && p.hanh_dong === 'MANAGE').id } }); return answer(); };
  assert.equal((await ask()).success, true); // General chat has no ERP source and remains available.
  const before = calls; assert.equal((await ask()).success, true); assert.equal(calls, before + 1);
  assert((await logs()).every(row => row.token_dau_vao > 0));
});

test('editing connection and job prices mid-tool-turn leaves routing, result and available budget intact', async () => {
  const config = { job: 'GENERAL', version: null, connectionId: connection.id, model: 'test-model', prices: prices('test-model') };
  assert((await as(manager, () => admin.saveAiJob(config))).success);
  const job = await db.cau_hinh_tac_vu_ai.findFirstOrThrow({ where: { company_id: manager.company_id } });
  const high = { ...prices('test-model'), input: '999999999', output: '999999999' };
  transport = async () => {
    if (calls === 1) {
      assert((await as(manager, () => admin.saveAiJob({ ...config, version: job.updated_at.toISOString(), prices: high }))).success);
      assert((await as(manager, () => admin.saveAiConnectionPolicy({ id: connection.id, version: connection.updated_at.toISOString(), limit: '100', prices: high }))).success);
      return json({ status: 'completed', output: [{ type: 'function_call', name: 'lookup', arguments: '{"kind":"categories"}', call_id: 'lookup' }], usage: { input_tokens: 10, output_tokens: 2 } });
    }
    return answer();
  };
  const result = await ask(); assert(result.success, result.message); assert.equal(calls, 2);
  const [, row] = await logs(); assert(row.chi_phi_uoc_tinh.gt(100));
  assert.equal((await as(manager, admin.getMyAiUsage)).remaining, '100.000000');
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { created_at: new Date(Date.now() - 300000) } });
  assert((await as(manager, () => admin.reconcileAiCall({ id: row.id, cost: '1.25', reason: 'Đã xác minh chi phí lần gọi' }))).success);
  assert.equal((await as(manager, admin.getMyAiUsage)).remaining, '98.750000');
});

test('malformed, zero and overflowing price estimates preserve chat and provider usage', async () => {
  const model = connection.model_mac_dinh;
  for (const [price, input, expected] of [
    [{ ...prices(model), input: 'invalid' }, 100, null],
    [prices('another-model'), 100, null],
    [{ ...prices(model), input: '0', cached: '0', output: '0' }, 100, '0'],
    [{ ...prices(model), input: '999999999' }, 2000000000, null],
  ]) {
    await db.ket_noi_ai.update({ where: { id: connection.id }, data: { cau_hinh_gia: price } });
    transport = async () => answer({ input_tokens: input, output_tokens: 1 });
    const result = await ask(); assert(result.success, result.message);
    const row = (await logs()).at(-1); assert.equal(row.token_dau_vao, input);
    assert.equal(row.chi_phi_uoc_tinh?.toString() ?? null, expected);
  }
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
  await db.$executeRawUnsafe('CREATE TRIGGER ai_gov_test_fail BEFORE INSERT ON he_thong.nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_gov_test_fail()');
  try { assert.equal((await as(manager, () => admin.saveAiAccountLimit({ accountId: manager.id, version: manager.updated_at.toISOString(), limit: '5' }))).success, false); }
  finally { await db.$executeRawUnsafe('DROP TRIGGER ai_gov_test_fail ON he_thong.nhat_ky_hoat_dong'); await db.$executeRawUnsafe('DROP FUNCTION ai_gov_test_fail()'); }
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
  const before = calls; assert((await ask()).success); assert.equal(calls, before + 1);
  assert.equal((await db.nhat_ky_goi_ai.findUniqueOrThrow({ where: { id: row.id } })).chi_phi_uoc_tinh, null);
  const limited = await as(manager, admin.getMyAiUsage); assert(limited.success); assert(limited.unknown); assert.equal(limited.remaining, '100.000000');
});

test('unknown settled costs do not consume budgets; legacy reservations are ignored and reconciled costs still block', async () => {
  transport = async () => { throw Error('network'); }; assert.equal((await ask()).success, false);
  const row = (await logs())[0];
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { du_phong: 100, created_at: new Date(Date.now() - 300000) } });
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: '0.1' } });
  await db.ket_noi_ai.update({ where: { id: connection.id }, data: { han_muc_chi_phi_thang: '0.1' } });
  let mine = await as(manager, admin.getMyAiUsage); assert(mine.success); assert.equal(mine.remaining, '0.100000'); assert(mine.unknown);
  const report = await as(manager, () => admin.getAiUsage({ month: aiMonth() })); assert(report.success); assert.equal(report.confirmed, '0.000000'); assert.equal(report.rows[0].cost, null);
  transport = async () => answer(); assert((await ask()).success);
  assert.equal((await db.nhat_ky_goi_ai.findUniqueOrThrow({ where: { id: row.id } })).du_phong.toString(), '100');
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { trang_thai: 'DANG_GOI' } });
  assert((await ask()).success);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: null } });
  assert((await ask()).success); const before = calls;
  await db.nhat_ky_goi_ai.update({ where: { id: row.id }, data: { trang_thai: 'CHUA_RO' } });
  assert((await as(manager, () => admin.reconcileAiCall({ id: row.id, cost: '0.2', reason: 'Chi phí đối soát thử nghiệm vượt mức cấp' }))).success);
  assert.match((await ask()).message, /Ngân sách tháng/); assert.equal(calls, before);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: '0.1' } });
  mine = await as(manager, admin.getMyAiUsage); assert(mine.success); assert.equal(mine.remaining, '0.000000'); assert.equal(mine.unknown, false);
  assert.match((await ask()).message, /Hạn mức AI tháng/); assert.equal(calls, before);
});


test('response regression: slow long answer survives 25 seconds, uses full output cap and persists without truncation', { timeout: 40000 }, async () => {
  const text = 'Bài phát biểu kiểm thử. '.repeat(500);
  transport = async (_, opts) => {
    const body = JSON.parse(opts.body);
    assert.equal(body.max_output_tokens, 12000);
    await new Promise(resolve => setTimeout(resolve, 26000));
    assert.equal(opts.signal.aborted, false, 'Old 25-second timeout would abort this response');
    return json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 100, output_tokens: 5000 } });
  };
  const result = await ask({ message: 'Soạn bài phát biểu dài' });
  assert(result.success, result.message); assert.equal(result.text, text); assert.equal(calls, 1);
  const saved = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: result.conversationId, vai_tro: 'TRO_LY' } });
  assert.equal(saved.noi_dung, text); assert.equal(saved.trang_thai, 'HOAN_TAT');
});

test('response regression: timeout at headers or body is distinct from network and invalid JSON, never retries', async () => {
  for (const kind of ['headers', 'body', 'network', 'json']) {
    transport = async () => {
      if (kind === 'headers') throw new DOMException('PRIVATE-ERROR-DETAIL', 'TimeoutError');
      if (kind === 'network') throw new Error('PRIVATE-ERROR-DETAIL');
      if (kind === 'json') return new Response('<html>PRIVATE-ERROR-DETAIL</html>');
      return new Response(new ReadableStream({ start(controller) { controller.error(new DOMException('PRIVATE-ERROR-DETAIL', 'TimeoutError')); } }));
    };
    const requestId = randomUUID(), before = calls;
    const result = await ask({ requestId }); assert.equal(result.success, false); assert.equal(calls, before + 1);
    assert.match(result.message, kind === 'headers' || kind === 'body' ? /thời gian chờ/ : kind === 'json' ? /không đọc được/ : /lỗi kết nối/);
    const audit = await db.nhat_ky_hoat_dong.findFirstOrThrow({ where: { company_id: manager.company_id, doi_tuong_id: `ai:${requestId}`, hanh_dong: 'AI_API_ERROR' } });
    assert.equal(audit.du_lieu_moi.reason, kind === 'headers' || kind === 'body' ? 'timeout' : kind === 'json' ? 'invalid_json' : 'network');
    assert(audit.du_lieu_moi.timeoutMs > 25000 && audit.du_lieu_moi.timeoutMs <= 180000);
    assert(!JSON.stringify(audit).includes('PRIVATE-ERROR-DETAIL'));
    const ledger = await db.nhat_ky_goi_ai.findFirstOrThrow({ where: { ma_yeu_cau: requestId } });assert.equal(ledger.trang_thai, 'CHUA_RO');assert.equal(ledger.token_dau_ra, null);
    const replay = await ask({ requestId }); assert.equal(replay.success, false); assert.equal(calls, before + 1);
  }
});

test('response regression: incomplete length is explained and recorded usage is retained', async () => {
  transport = async () => json({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: { input_tokens: 100, output_tokens: 6000 } });
  const result = await ask();assert.equal(result.success, false);assert.match(result.message, /giới hạn độ dài/);assert.equal(calls, 1);
  const ledger = (await logs())[0];assert.equal(ledger.trang_thai, 'HOAN_TAT');assert.equal(ledger.token_dau_ra, 6000);
});

test('response regression: failed turn keeps user facts without demanding clarification', () => {
  const { chatContext } = require('../../src/lib/ai-chat-server.ts');
  const history = chatContext([{ ma_yeu_cau: 'same', vai_tro: 'NGUOI_DUNG', noi_dung: 'Lễ kỷ niệm 20 năm, Chủ tịch phát biểu', trang_thai: 'HOAN_TAT' }, { ma_yeu_cau: 'same', vai_tro: 'TRO_LY', noi_dung: 'Lỗi timeout', trang_thai: 'LOI' }]);
  assert.match(history.messages[0].content, /Lễ kỷ niệm 20 năm, Chủ tịch phát biểu/);
  assert.match(history.messages[1].content, /Giữ thông tin/);assert(!history.messages[1].content.includes('cần làm rõ yêu cầu'));
});


test('response regression: DB accepts long assistant text and preserves role-specific bounds', async () => {
  const result = await ask(); assert(result.success, result.message);
  const rows = await db.tin_nhan_ai.findMany({ where: { hoi_thoai_id: result.conversationId } });
  const assistant = rows.find(r => r.vai_tro === 'TRO_LY'), user = rows.find(r => r.vai_tro === 'NGUOI_DUNG');
  await db.tin_nhan_ai.update({ where: { id: assistant.id }, data: { noi_dung: 'a'.repeat(32000) } });
  await assert.rejects(db.tin_nhan_ai.update({ where: { id: assistant.id }, data: { noi_dung: 'a'.repeat(32001) } }), /tin_nhan_ai_length_check/);
  await assert.rejects(db.tin_nhan_ai.update({ where: { id: user.id }, data: { noi_dung: 'a'.repeat(8001) } }), /tin_nhan_ai_length_check/);
});

test('feedback regression: provider errors persist and reload with recovery guidance, never retry automatically', async () => {
  const { getAiChat } = require('../../src/actions/ai-chat.ts');
  const { aiChatFeedback } = require('../../src/lib/ai-chat-feedback.ts');
  for (const [status, code, expected] of [[429,'insufficient_quota',/hết hạn mức/],[429,'rate_limit_exceeded',/giới hạn tốc độ/],[429,null,/hoặc/],[401,null,/Khóa API/],[403,null,/quyền truy cập/],[404,null,/Model/],[503,null,/sự cố/]]) {
    transport = async () => new Response(JSON.stringify({ error: { code, message: 'PRIVATE-PROVIDER-DETAIL' } }), { status });
    const requestId = randomUUID(), before = calls;
    const result = await ask({ requestId }); assert.equal(result.success, false); assert.match(result.message, expected); assert.equal(calls, before + 1);
    const reload = await as(manager, () => getAiChat({ id: result.conversationId })); assert(reload.success);
    const failed = reload.messages.find(m => m.role === 'assistant'); assert.equal(failed.status, 'LOI'); assert.equal(failed.content, result.message); assert(aiChatFeedback(failed.content).suggestion);
    assert(!JSON.stringify(reload).includes('PRIVATE-PROVIDER-DETAIL'));
    await ask({ requestId }); assert.equal(calls, before + 1);
  }
});


// Long-chat fixtures are inserted directly, never use real provider calls or the user's DB.
async function memoryFixture(turns = 15, long = true, owner = manager) {
  const chat = await db.hoi_thoai_ai.create({ data: { company_id: owner.company_id, account_id: owner.id, tieu_de: 'Context fixture' } });
  const data = [];
  for (let i = 0; i < turns; i++) {
    const id = randomUUID(), common = { company_id: owner.company_id, hoi_thoai_id: chat.id, ma_yeu_cau: id, trang_thai: 'HOAN_TAT' };
    data.push({ ...common, vai_tro: 'NGUOI_DUNG', noi_dung: `SOURCE-${i}: Mua HDMI; chốt 2 dây, chưa nhập kho. ` + (long ? 'Nội dung kiểm thử. '.repeat(170) : '') });
    data.push({ ...common, vai_tro: 'TRO_LY', noi_dung: `ANSWER-${i}: Chưa lưu. ` + (long ? 'Dữ kiện chi tiết. '.repeat(240) : ''), du_lieu_kem_theo: { version: 1, ngu_canh: [] } });
  }
  await db.tin_nhan_ai.createMany({ data });
  return chat;
}
const textResponse = text => json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 100, output_tokens: 20 } });
const historyCall = (extra = {}) => json({ status: 'completed', output: [{ type: 'function_call', name: 'search_chat_history', arguments: JSON.stringify({ search: '', beforeId: null, messageId: null, offset: 0, ...extra }), call_id: 'history-' + calls }], usage: { input_tokens: 100, output_tokens: 20 } });
const isSummary = body => body.instructions.startsWith('Tóm tắt bối cảnh');

test('memory: compacts old history, preserves originals, checkpoints and charges every model call', async () => {
  const chat = await memoryFixture();
  const before = await db.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id }, orderBy: { id: 'asc' } });
  let summaries = 0, finalInput;
  transport = async (_, opts) => {
    const body = JSON.parse(opts.body); assert.equal(body.store, false);
    if (isSummary(body)) { summaries++; assert.deepEqual(body.tools, []); assert.equal(body.max_output_tokens, 6000); return textResponse('HDMI: chốt 2 dây, chưa nhập kho; SOURCE-0.'); }
    finalInput = JSON.stringify(body.input); return answer();
  };
  const requestId = randomUUID(), result = await ask({ conversationId: chat.id, requestId, message: 'Tiếp tục nhập HDMI' });
  assert(result.success, result.message); assert(summaries > 0); assert(finalInput.includes('chốt 2 dây')); assert(!finalInput.includes('SOURCE-0:'));
  const after = await db.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id, id: { in: before.map(r => r.id) } }, orderBy: { id: 'asc' } });
  assert.deepEqual(after, before);
  const saved = await db.tin_nhan_ai.findFirstOrThrow({ where: { ma_yeu_cau: requestId, vai_tro: 'TRO_LY' } });
  assert(saved.du_lieu_kem_theo.memory.throughId < saved.id); assert.equal(saved.du_lieu_kem_theo.memory.model, 'test-model');
  assert.equal((await logs()).length, calls); assert.equal(result.usage.inputTokens, calls * 100);
  const count = calls; assert((await ask({ conversationId: chat.id, requestId, message: 'Tiếp tục nhập HDMI' })).success); assert.equal(calls, count);
  transport = async (_, opts) => { const body = JSON.parse(opts.body); assert(!isSummary(body)); assert(JSON.stringify(body.input).includes('chốt 2 dây')); return answer(); };
  assert((await ask({ conversationId: chat.id })).success);
});

test('memory: completed compaction survives a later provider failure and is reused', async () => {
  const chat = await memoryFixture(); let summaries = 0;
  transport = async (_, opts) => { if (isSummary(JSON.parse(opts.body))) { summaries++; return textResponse('Giữ 2 HDMI; chưa lưu.'); } throw Error('network'); };
  const result = await ask({ conversationId: chat.id }); assert(!result.success); assert(summaries > 0);
  const checkpoint = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: chat.id, trang_thai: 'LOI' } }); assert(checkpoint.du_lieu_kem_theo.memory);
  transport = async (_, opts) => { const body = JSON.parse(opts.body); assert(!isSummary(body)); assert(JSON.stringify(body.input).includes('Giữ 2 HDMI')); return answer(); };
  assert((await ask({ conversationId: chat.id })).success);
});

test('memory: failed compaction never advances checkpoint or deletes original content', async () => {
  const chat = await memoryFixture(); const count = await db.tin_nhan_ai.count({ where: { hoi_thoai_id: chat.id } });
  transport = async (_, opts) => { assert(isSummary(JSON.parse(opts.body))); return textResponse('x'.repeat(12001)); };
  const result = await ask({ conversationId: chat.id }); assert(!result.success); assert.match(result.message, /thu gọn/); assert.equal(calls, 1);
  assert.equal(await db.tin_nhan_ai.count({ where: { hoi_thoai_id: chat.id } }), count + 2);
  const last = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: chat.id }, orderBy: { id: 'desc' } }); assert.equal(last.du_lieu_kem_theo, null);
});

test('memory: own-chat retrieval is paginated, supports long messages and rejects foreign IDs', async () => {
  const chat = await memoryFixture(2, false); const other = await memoryFixture(2, false, foreign);
  const target = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: chat.id, vai_tro: 'TRO_LY' } });
  await db.tin_nhan_ai.update({ where: { id: target.id }, data: { noi_dung: 'a'.repeat(12000) + 'TAIL-MARKER' } });
  const foreignMessage = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: other.id } });
  let stage = 0;
  transport = async (_, opts) => {
    const body = JSON.parse(opts.body); stage++;
    if (stage === 1) return historyCall({ messageId: target.id });
    const output = JSON.parse(body.input.filter(i => i.type === 'function_call_output').at(-1).output);
    if (stage === 2) { assert.equal(output.rows[0].nextOffset, 12000); return historyCall({ messageId: target.id, offset: 12000 }); }
    if (stage === 3) { assert.equal(output.rows[0].content, 'TAIL-MARKER'); return historyCall({ messageId: foreignMessage.id }); }
    assert.deepEqual(output.rows, []); return answer();
  };
  assert((await ask({ conversationId: chat.id })).success); assert.equal(stage, 4);
  const before = calls; assert(!(await as(foreign, () => askAi({ requestId: randomUUID(), conversationId: chat.id, message: 'Xem chat' }))).success); assert.equal(calls, before);
});

test('memory: source permission revoked during compaction prevents checkpoint and future reads', async () => {
  const chat = await memoryFixture();
  const last = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: chat.id, vai_tro: 'TRO_LY' } });
  await db.tin_nhan_ai.update({ where: { id: last.id }, data: { du_lieu_kem_theo: { version: 1, ngu_canh: [{ tool: 'lookup', filters: { kind: 'locations' }, references: [] }] } } });
  transport = async () => {
    await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: { in: permissions.filter(p => p.phan_he === 'LOCATIONS').map(p => p.id) } } });
    return textResponse('Dữ liệu có nguồn cần quyền.');
  };
  const result = await ask({ conversationId: chat.id }); assert(!result.success); assert.equal(calls, 1);
  const saved = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: chat.id }, orderBy: { id: 'desc' } }); assert.equal(saved.du_lieu_kem_theo, null);
  const { getAiChat } = require('../../src/actions/ai-chat.ts'); assert(!(await as(manager, () => getAiChat({ id: chat.id }))).success);
});

test('memory: no daily/200-turn cap, 8000-char input works; burst and cross-chat lease remain', async () => {
  const chat = await memoryFixture(201, false);
  await db.nhat_ky_hoat_dong.createMany({ data: Array.from({length: 100}, () => ({ company_id: manager.company_id, account_id: manager.id, ten_dang_nhap: manager.ten_dang_nhap, ho_ten: 'Fixture', phan_he: 'AI', hanh_dong: 'AI_REQUEST', doi_tuong_id: 'ai:' + randomUUID(), mo_ta: 'Fixture', created_at: new Date(Date.now() - 3600000) })) });
  transport = async (_, opts) => isSummary(JSON.parse(opts.body)) ? textResponse('Lịch sử dài đã tóm tắt.') : answer();
  assert((await ask({ conversationId: chat.id, message: 'a'.repeat(8000) })).success);
  const count = calls; assert(!(await ask({ message: 'a'.repeat(8001) })).success); assert.equal(calls, count);
  await db.nhat_ky_hoat_dong.create({ data: { company_id: manager.company_id, account_id: manager.id, ten_dang_nhap: manager.ten_dang_nhap, ho_ten: 'Fixture', phan_he: 'AI', hanh_dong: 'AI_REQUEST', doi_tuong_id: 'ai:' + randomUUID(), mo_ta: 'Fixture', created_at: new Date(Date.now() - 6 * 60000) } });
  assert.match((await ask()).message, /đang xử lý/); assert.equal(calls, count);
});

test('memory: 25-call limit includes compaction and does not make call 26', async () => {
  const chat = await memoryFixture();
  transport = async (_, opts) => isSummary(JSON.parse(opts.body)) ? textResponse('HDMI, chưa lưu.') : historyCall();
  const result = await ask({ conversationId: chat.id }); assert(!result.success); assert.match(result.message, /giới hạn xử lý/); assert.equal(calls, 25); assert.equal((await logs()).length, 25);
});

test('memory: tool transcript compacts complete call/output groups and keeps current question', async () => {
  const { AI_LIMITS } = require('../../src/lib/ai-config.ts'); const original = AI_LIMITS.history.toolCompactAtBytes;
  AI_LIMITS.history.toolCompactAtBytes = 1000;
  try {
    const chat = await memoryFixture(1, true); let mainCalls = 0, summaries = 0;
    transport = async (_, opts) => {
      const body = JSON.parse(opts.body);
      if (isSummary(body)) { summaries++; assert(JSON.stringify(body.input).includes('function_call_output')); return textResponse('Kết quả tra lại đã có.'); }
      if (++mainCalls === 1) return historyCall();
      assert(JSON.stringify(body.input).includes('CURRENT-REQUEST')); assert(JSON.stringify(body.input).includes('Kết quả tra lại đã có.'));
      assert(!body.input.some(i => i.type === 'function_call' || i.type === 'function_call_output')); return answer();
    };
    assert((await ask({ conversationId: chat.id, message: 'CURRENT-REQUEST' })).success); assert.equal(summaries, 1); assert.equal(calls, 3);
  } finally { AI_LIMITS.history.toolCompactAtBytes = original; }
});


test('memory: eight successful lookup traces persist without the old six-tool ceiling', async () => {
  transport = async () => calls <= 8 ? json({ status: 'completed', output: [{ type: 'function_call', name: 'lookup', arguments: JSON.stringify({ kind: 'categories', search: '' }), call_id: 'lookup-' + calls }], usage: { input_tokens: 100, output_tokens: 20 } }) : answer();
  const result = await ask(); assert(result.success, result.message); assert.equal(calls, 9);
  const row = await db.tin_nhan_ai.findFirstOrThrow({ where: { hoi_thoai_id: result.conversationId, vai_tro: 'TRO_LY' } }); assert.equal(row.du_lieu_kem_theo.ngu_canh.length, 8);
});

test('memory: burst protection still blocks the eleventh recent request', async () => {
  await db.nhat_ky_hoat_dong.createMany({ data: Array.from({ length: 10 }, () => ({ company_id: manager.company_id, account_id: manager.id, ten_dang_nhap: manager.ten_dang_nhap, ho_ten: 'Fixture', phan_he: 'AI', hanh_dong: 'AI_REQUEST', doi_tuong_id: 'ai:' + randomUUID(), mo_ta: 'Fixture' })) });
  assert.match((await ask()).message, /10 yêu cầu trong 5 phút/); assert.equal(calls, 0);
});
