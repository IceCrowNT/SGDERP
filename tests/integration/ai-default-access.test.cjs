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
const { uploadAiAttachment, removeAiAttachment } = require('../../src/actions/ai-attachments.ts');
const { GET: download } = require('../../src/app/media/ai-attachments/[id]/route.ts');
const { listAiWorks, prepareCategoryDepreciationWork } = require('../../src/actions/ai-work.ts');
const { getMyAiUsage, getAiUsage, saveAiAccountLimit } = require('../../src/actions/ai-governance.ts');
const { getAiConnections } = require('../../src/actions/ai-settings.ts');
const { readAccountSession } = require('../../src/lib/account-session.ts');
const { currentAccountActor } = require('../../src/lib/rbac-server.ts');
const { canUseAiChat } = require('../../src/lib/ai-pilot.ts');
const { getAiChat, listAiChats, renameAiChat, archiveAiChat } = require('../../src/actions/ai-chat.ts');
const { executeAiInventoryTool } = require('../../src/actions/ai-inventory.ts');
const { askAi } = require('../../src/actions/ai.ts');
const { storeAiSecret } = require('../../src/lib/ai-secret-store.ts');
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
const prices = model => ({ version: 1, model, input: '1', cached: '0.5', output: '2' });
const json = value => new Response(JSON.stringify(value), { status: 200 });
const answer = (usage = { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 40 } }) => json({ id: 'resp_test', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Đã trả lời bằng dữ liệu kiểm thử.' }] }], usage });
let manager, role, foreign, permissions, originalFetch, transport;
async function makeAccount(companyId, codes) {
  const r = await db.vai_tro.create({ data: { company_id: companyId, ma_vai_tro: 'DEFAULT', ten_vai_tro: 'Test', danh_sach_quyen: { create: permissions.filter(p => codes.includes(`${p.phan_he}:${p.hanh_dong}`)).map(p => ({ permission_id: p.id })) } } });
  const a = await db.tai_khoan.create({ data: { company_id: companyId, ten_dang_nhap: 'governance-' + randomUUID(), ten_hien_thi: 'Người thử quản trị AI', mat_khau_bam: 'disabled', han_muc_ai_thang: null, danh_sach_vai_tro: { create: { role_id: r.id } } } });
  return { a, r };
}
async function createConnection(companyId, model = 'test-model', isDefault = false) {
  return db.ket_noi_ai.create({ data: { company_id: companyId, ten_ket_noi: 'Kết nối thử ' + model, la_mac_dinh: isDefault, model_mac_dinh: model, cau_hinh_gia: prices(model), han_muc_chi_phi_thang: '100', tham_chieu_bi_mat: await storeAiSecret(companyId, 'sk-test-governance-secret-0000'), hau_to_khoa: '0000' } });
}
const ask = (extra = {}) => as(manager, () => askAi({ requestId: randomUUID(), message: 'Tra cứu thử', ...extra }));
before(async () => {
  permissions = await db.quyen.findMany({ where: { OR: [{ phan_he: 'AI' }, { phan_he: { in: ['ACCOUNTS', 'ROLES', 'ASSETS', 'LOCATIONS', 'INVENTORY'] }, hanh_dong: 'MANAGE' }] } });
  const dir = path.resolve('outputs/ai-governance'); await fs.mkdir(dir, { recursive: true }); process.env.AI_SECRET_STORAGE_DIR = await fs.mkdtemp(path.join(dir, 'vault-'));
  process.env.AI_ATTACHMENT_STORAGE_DIR = await fs.mkdtemp(path.join(dir, 'files-'));
  originalFetch = global.fetch; global.fetch = async (url, options) => { assert.equal(url, 'https://api.openai.com/v1/responses'); return transport(url, options); };
});
beforeEach(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: 'Thử quản trị ' + randomUUID() } });
  const fixture = await makeAccount(company.id, []); manager = fixture.a; role = fixture.r;
  const otherCompany = await db.cong_ty.create({ data: { ten_cong_ty: 'Công ty khác ' + randomUUID() } }); foreign = (await makeAccount(otherCompany.id, [])).a;
  await createConnection(company.id, 'test-model', true); process.env.AI_PILOT_ACCOUNT_ID = String(foreign.id);
  transport = async () => answer();
});
after(async () => { global.fetch = originalFetch; await db.$disconnect(); });

const ok = r => { assert(r.success, r.message); return r; };
const toolReply = (name, args) => json({ status: 'completed', output: [{ type: 'function_call', name, arguments: JSON.stringify(args), call_id: 'call_inventory' }], usage: { input_tokens: 10, output_tokens: 2 } });
const grant = async (moduleName, action) => {
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: moduleName, hanh_dong: action, pham_vi: 'ALL' } });
  const extra = await db.vai_tro.create({ data: { company_id: manager.company_id, ma_vai_tro: randomUUID(), ten_vai_tro: 'Quyền bổ sung', danh_sach_quyen: { create: { permission_id: permission.id } }, danh_sach_tai_khoan: { create: { account_id: manager.id } } } });
  return extra;
};
const downloadAs = (account, id) => as(account, () => download(new Request('http://localhost/media/ai-attachments/' + id), { params: Promise.resolve({ id: String(id) }) }));

test('DEFAULT chats with no pilot binding or ERP grants, continues, renames and restores own history', async () => {
  delete process.env.AI_PILOT_ACCOUNT_ID;
  const session = await readAccountSession(manager.id);
  assert(canUseAiChat(session)); assert(session.roleCodes.includes('DEFAULT'));
  transport = async (_, opts) => {
    const names = JSON.parse(opts.body).tools.map(t => t.name);
    assert(names.includes('create_word_file')); assert(names.includes('create_excel_file')); assert(names.includes('read_ai_attachment'));
    assert(!names.some(n => /inventory|asset|location|lookup/.test(n)));
    return answer();
  };
  const result = ok(await ask({ message: 'Giúp tôi viết lời giới thiệu' }));
  ok(await ask({ conversationId: result.conversationId, message: 'Viết ngắn hơn' }));
  const chat = ok(await as(manager, () => getAiChat({ id: result.conversationId })));
  assert.equal(chat.messages.length, 4);
  ok(await as(manager, () => renameAiChat({ id: result.conversationId, expectedTitle: chat.chat.title, title: 'Bản giới thiệu' })));
  ok(await as(manager, () => archiveAiChat({ id: result.conversationId, archived: true })));
  assert.equal((await ask({ conversationId: result.conversationId })).success, false);
  ok(await as(manager, () => archiveAiChat({ id: result.conversationId, archived: false })));
  ok(await ask({ conversationId: result.conversationId }));
  assert.equal(ok(await as(manager, () => listAiChats())).chats[0].title, 'Bản giới thiệu');
  assert.equal(ok(await as(manager, () => getMyAiUsage())).limit, null);
  assert.equal(await db.vai_tro_quyen.count({ where: { role_id: role.id } }), 0);
});

test('DEFAULT uploads and analyzes a spreadsheet; generated Word/Excel download only by owner', async () => {
  const XLSX = require('xlsx'), book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Mặt hàng','Số lượng'],['HDMI',2]]), 'Data');
  const form = new FormData(); form.set('uploadId', randomUUID()); form.set('file', new File([XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })], 'nguon.xlsx'));
  const uploaded = ok(await as(manager, () => uploadAiAttachment(form))).file;
  let step = 0;
  transport = async (_, opts) => {
    const body = JSON.parse(opts.body);
    if (step > 0) { const output = JSON.parse(body.input.filter(x => x.type === 'function_call_output').at(-1).output); assert(!output.error, output.error); }
    if (step++ === 0) return toolReply('read_ai_attachment', { fileId: uploaded.id, sheet: 'Data', start: 1, limit: 20 });
    if (step === 2) return toolReply('analyze_ai_sheet', { fileId: uploaded.id, sheet: 'Data', headerRow: 1, groupColumn: null, valueColumn: 'B', operation: 'sum', filters: [] });
    return answer();
  };
  const chat = ok(await ask({ attachmentIds: [uploaded.id], message: 'Đọc dữ liệu Excel' }));
  for (const [name, args] of [
    ['create_word_file', { filename: 'gioi-thieu.docx', title: 'Giới thiệu', paragraphs: ['Nội dung riêng của DEFAULT'], tables: [] }],
    ['create_excel_file', { filename: 'bang-tinh.xlsx', sheets: [{ name: 'Data', rows: [['Hàng','SL'], ['HDMI',2]] }] }],
  ]) {
    step = 0; transport = async () => step++ === 0 ? toolReply(name, args) : answer();
    ok(await ask({ conversationId: chat.conversationId, message: 'Tạo tài liệu riêng' }));
  }
  const files = ok(await as(manager, () => getAiChat({ id: chat.conversationId }))).attachments;
  assert.equal(files.length, 3);
  for (const file of files) { const response = await downloadAs(manager, file.id); assert.equal(response.status, 200); assert((await response.arrayBuffer()).byteLength > 0); assert.equal((await downloadAs(foreign, file.id)).status, 404); }
  const sibling = await db.tai_khoan.create({ data: { company_id: manager.company_id, ten_dang_nhap: randomUUID(), ten_hien_thi: 'Khác', mat_khau_bam: 'disabled' } });
  assert.equal((await as(sibling, () => getAiChat({ id: chat.conversationId }))).success, false);
  assert.equal((await downloadAs(sibling, files[0].id)).status, 404);
  assert.deepEqual(ok(await as(sibling, () => listAiChats())).chats, []);
  assert.equal((await as(foreign, () => removeAiAttachment({ id: uploaded.id }))).success, true); // idempotent no-op, not deletion
  assert(await db.tep_dinh_kem_ai.findUnique({ where: { id: uploaded.id } }));
});

test('DEFAULT cannot invoke forged ERP tools, prepare business work or access AI administration', async () => {
  transport = async () => toolReply('search_assets', { search: 'secret' });
  assert.equal((await ask()).success, false);
  assert.equal((await as(manager, () => prepareCategoryDepreciationWork({ requestId: randomUUID(), months: 60 }))).success, false);
  assert((await as(manager, () => executeAiInventoryTool('search_inventory', {}, randomUUID()))).output.error);
  assert.deepEqual(ok(await as(manager, () => listAiWorks())).works, []);
  assert.equal((await as(manager, () => getAiConnections())).success, false);
  assert.equal((await as(manager, () => getAiUsage({}))).success, false);
  assert.equal((await as(manager, () => saveAiAccountLimit({}))).success, false);
});

test('ERP VIEW exposes reads only; revoked sources hide history titles, contents and derived files', async () => {
  const role = await grant('ASSETS', 'VIEW');
  let step = 0;
  transport = async (_, opts) => {
    const names = JSON.parse(opts.body).tools.map(t => t.name);
    assert(names.includes('search_assets')); assert(!names.includes('prepare_asset')); assert(!names.includes('prepare_location'));
    return step++ === 0 ? toolReply('lookup', { kind: 'categories', search: '' }) : answer();
  };
  const result = ok(await ask({ message: 'Danh mục tài sản' }));
  step = 0; transport = async () => step++ === 0 ? toolReply('create_word_file', { filename: 'danh-muc.docx', title: 'Danh mục', paragraphs: ['Thông tin đã tra cứu'], tables: [] }) : answer();
  ok(await ask({ conversationId: result.conversationId }));
  const file = ok(await as(manager, () => getAiChat({ id: result.conversationId }))).attachments[0];
  await db.tai_khoan_vai_tro.deleteMany({ where: { account_id: manager.id, role_id: role.id } });
  assert.equal((await as(manager, () => getAiChat({ id: result.conversationId }))).success, false);
  assert.equal(ok(await as(manager, () => listAiChats())).chats[0].title, 'Cuộc trò chuyện không khả dụng');
  assert.equal((await downloadAs(manager, file.id)).status, 404);
  assert.equal((await ask({ conversationId: result.conversationId })).success, false);
  transport = async () => answer(); ok(await ask({ message: 'Chat mới không liên quan ERP' }));
});

test('LOCATIONS and INVENTORY grant access without account/role/asset management', async () => {
  for (const moduleName of ['LOCATIONS','INVENTORY']) await grant(moduleName, 'MANAGE');
  transport = async (_, opts) => {
    const names = JSON.parse(opts.body).tools.map(t => t.name);
    assert(names.includes('prepare_location')); assert(names.includes('prepare_inventory_receipt')); assert(!names.includes('prepare_asset'));
    return answer();
  };
  ok(await ask());
  transport = async (_, opts) => { const names = JSON.parse(opts.body).tools.map(t=>t.name); assert(names.includes('search_inventory')); assert(!names.includes('prepare_inventory_receipt')); assert(!names.includes('create_word_file')); return answer(); };
  ok(await ask({ job: 'LOOKUP' }));
});

test('invalid sessions cannot chat/upload and transaction rechecks account state', async () => {
  assert.equal((await as(null, () => askAi({ requestId: randomUUID(), message: 'hi' }))).success, false);
  for (const change of [{ bat_buoc_doi_mat_khau: true }, { cho_phep_dang_nhap: false }, { phien_ban_dang_nhap: manager.phien_ban_dang_nhap + 1 }]) {
    const session = await readAccountSession(manager.id);
    await db.tai_khoan.update({ where: { id: manager.id }, data: change });
    assert.equal((await ask()).success, false);
    await assert.rejects(db.$transaction(tx => currentAccountActor(tx, session)));
    assert.equal((await as(manager, () => uploadAiAttachment(new FormData()))).success, false);
    await db.tai_khoan.update({ where: { id: manager.id }, data: { cho_phep_dang_nhap: true, bat_buoc_doi_mat_khau: false, phien_ban_dang_nhap: manager.phien_ban_dang_nhap } });
  }
});

test('zero budget prevents provider call, NULL permits it and disabling company connection blocks', async () => {
  let called = 0; transport = async () => { called++; return answer(); };
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 0 } });
  assert.equal((await ask()).success, false); assert.equal(called, 0);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: null } });
  ok(await ask()); assert.equal(called, 1);
  await db.ket_noi_ai.updateMany({ where: { company_id: manager.company_id }, data: { dang_su_dung: false } });
  assert.equal((await ask()).success, false); assert.equal(called, 1);
});
