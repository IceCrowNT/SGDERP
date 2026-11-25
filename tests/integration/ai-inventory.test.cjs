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
const inventory = require('../../src/actions/inventory.ts');
const { getAiChat } = require('../../src/actions/ai-chat.ts');
const { executeAiInventoryTool } = require('../../src/actions/ai-inventory.ts');
const { canUseBusinessTool } = require('../../src/lib/ai-tool-access.ts');
const { askAi } = require('../../src/actions/ai.ts');
const { storeAiSecret } = require('../../src/lib/ai-secret-store.ts');
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
const prices = model => ({ version: 1, model, input: '1', cached: '0.5', output: '2' });
const json = value => new Response(JSON.stringify(value), { status: 200 });
const answer = (usage = { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 40 } }) => json({ id: 'resp_test', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Đã trả lời bằng dữ liệu kiểm thử.' }] }], usage });
let manager, role, foreign, permissions, originalFetch, transport;
async function makeAccount(companyId, codes) {
  const r = await db.vai_tro.create({ data: { company_id: companyId, ma_vai_tro: 'TEST_' + randomUUID(), ten_vai_tro: 'Test', danh_sach_quyen: { create: permissions.filter(p => codes.includes(`${p.phan_he}:${p.hanh_dong}`)).map(p => ({ permission_id: p.id })) } } });
  const a = await db.tai_khoan.create({ data: { company_id: companyId, ten_dang_nhap: 'governance-' + randomUUID(), ten_hien_thi: 'Người thử quản trị AI', mat_khau_bam: 'disabled', han_muc_ai_thang: '100', danh_sach_vai_tro: { create: { role_id: r.id } } } });
  return { a, r };
}
async function createConnection(companyId, model = 'test-model', isDefault = false) {
  return db.ket_noi_ai.create({ data: { company_id: companyId, ten_ket_noi: 'Kết nối thử ' + model, la_mac_dinh: isDefault, model_mac_dinh: model, cau_hinh_gia: prices(model), han_muc_chi_phi_thang: '100', tham_chieu_bi_mat: await storeAiSecret(companyId, 'sk-test-governance-secret-0000'), hau_to_khoa: '0000' } });
}
const ask = (extra = {}) => as(manager, () => askAi({ requestId: randomUUID(), message: 'Tra cứu thử', ...extra }));
before(async () => {
  permissions = await db.quyen.findMany({ where: { OR: [{ phan_he: 'AI' }, { phan_he: { in: ['ACCOUNTS', 'ROLES', 'ASSETS', 'LOCATIONS', 'INVENTORY'] }, hanh_dong: 'MANAGE' }] } });
  const dir = path.resolve('outputs/ai-governance'); await fs.mkdir(dir, { recursive: true }); process.env.AI_SECRET_STORAGE_DIR = await fs.mkdtemp(path.join(dir, 'vault-'));
  originalFetch = global.fetch; global.fetch = async (url, options) => { assert.equal(url, 'https://api.openai.com/v1/responses'); return transport(url, options); };
});
beforeEach(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: 'Thử quản trị ' + randomUUID() } });
  const fixture = await makeAccount(company.id, permissions.map(p => `${p.phan_he}:${p.hanh_dong}`)); manager = fixture.a; role = fixture.r;
  const otherCompany = await db.cong_ty.create({ data: { ten_cong_ty: 'Công ty khác ' + randomUUID() } }); foreign = (await makeAccount(otherCompany.id, ['AI:MANAGE_CONNECTIONS','AI:VIEW_USAGE','AI:MANAGE_LIMITS'])).a;
  await createConnection(company.id, 'test-model', true); process.env.AI_PILOT_ACCOUNT_ID = String(manager.id);
  transport = async () => answer();
});
after(async () => { global.fetch = originalFetch; await db.$disconnect(); });

const ok = r => { assert(r.success, r.message); return r; };
const toolReply = (name, args) => json({ status: 'completed', output: [{ type: 'function_call', name, arguments: JSON.stringify(args), call_id: 'call_inventory' }], usage: { input_tokens: 10, output_tokens: 2 } });
async function fixtureInventory() {
  const category = ok(await as(manager, () => inventory.saveInventoryCategory({ code: 'INK', name: 'Mực in', kind: 'TIEU_HAO', description: '', active: true }))).row;
  const department = await db.phong_ban.create({ data: { company_id: manager.company_id, ma_phong_ban: 'KD', ten_phong_ban: 'Phòng kinh doanh' } });
  const item = ok(await as(manager, () => inventory.saveInventoryItem({ name: 'Mực Canon', categoryId: category.id, unit: 'lọ', minimum: null, departmentId: null, notes: '', active: true, initialQuantity: 10, initialRequestId: randomUUID() }))).row;
  return { category, department, item };
}
const transactionArgs = (itemId, extra = {}) => ({ itemId, operation: 'NHAP', quantity: 15, fromId: null, toId: null, employeeId: null, departmentId: null, issueId: null, reversalId: null, price: null, reason: '', notes: '', ...extra });
const details = id => as(manager, () => inventory.getInventoryDetail(id));
const stock = async id => ok(await details(id)).stock.reduce((n,r) => n+r.quantity, 0);

test('inventory tools follow account rights and read-only job; forged model tool cannot bypass', async () => {
  assert.equal(canUseBusinessTool({ permissions: { INVENTORY: 'MANAGE' } }, 'GENERAL', 'prepare_inventory_arbitrary'), false);
  const grant = permissions.find(p => p.phan_he === 'INVENTORY' && p.hanh_dong === 'MANAGE');
  await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: grant.id } });
  transport = async (_, opts) => { assert(!JSON.parse(opts.body).tools.some(t => t.name.includes('inventory'))); return answer(); };
  ok(await ask());
  const view = await db.quyen.findFirstOrThrow({ where: { phan_he: 'INVENTORY', hanh_dong: 'VIEW' } });
  await db.vai_tro_quyen.create({ data: { role_id: role.id, permission_id: view.id } });
  transport = async (_, opts) => { const names = JSON.parse(opts.body).tools.map(t=>t.name); assert(names.includes('search_inventory')); assert(!names.includes('prepare_inventory_transaction')); return toolReply('prepare_inventory_transaction', transactionArgs(1)); };
  assert.equal((await ask()).success, false);
  await db.vai_tro_quyen.create({ data: { role_id: role.id, permission_id: grant.id } });
  transport = async (_, opts) => { const names = JSON.parse(opts.body).tools.map(t=>t.name); assert(names.includes('search_inventory')); assert(!names.includes('prepare_inventory_transaction')); return answer(); };
  ok(await ask({ job: 'LOOKUP' }));
});

const prepareTransaction = (itemId, extra) => as(manager, () => executeAiInventoryTool('prepare_inventory_transaction', transactionArgs(itemId, extra), randomUUID()));
const record = async (itemId, extra) => as(manager, async () => inventory.recordInventoryTransaction({ ...transactionArgs(itemId, extra), requestId: randomUUID(), expected: ok(await details(itemId)).expected }));
const change = (draft, label, before, after) => assert(draft.changes.some(r => r.label === label && r.before === String(before) && r.after === String(after)), `Missing ${label}: ${before} → ${after}`);

test('accessory return, loss and reversal show balances and original recipient without writing before confirmation', async () => {
  const { department } = await fixtureInventory();
  const category = ok(await as(manager, () => inventory.saveInventoryCategory({ code: 'PK', name: 'Phụ kiện', kind: 'PHU_KIEN', description: '', active: true }))).row;
  const item = ok(await as(manager, () => inventory.saveInventoryItem({ name: 'Chuột', categoryId: category.id, unit: 'cái', minimum: null, departmentId: null, notes: '', active: true }))).row;
  const place = await db.vi_tri.create({ data: { company_id: manager.company_id, ten_vi_tri: 'Tủ IT', loai_vi_tri: 'KHU_VUC' } });
  ok(await record(item.id, { quantity: 10, toId: place.id }));
  const issued = ok(await record(item.id, { operation: 'CAP_PHAT', quantity: 4, fromId: place.id, departmentId: department.id }));
  const returned = await prepareTransaction(item.id, { operation: 'THU_HOI', quantity: 2, issueId: issued.id, toId: place.id });
  assert(returned.draft, returned.output.error); change(returned.draft, 'Đang giữ của lần cấp', 4, 2);
  assert(returned.draft.changes.some(r => r.after === department.ten_phong_ban));
  assert.equal(await stock(item.id), 6); const committed = ok(await as(manager, () => inventory.recordInventoryTransaction(returned.draft.values)));
  assert.equal(await stock(item.id), 8);
  const loss = await prepareTransaction(item.id, { operation: 'GIAM_DANG_CAP', quantity: 1, issueId: issued.id, reason: 'Hỏng' });
  assert(loss.draft, loss.output.error); change(loss.draft, 'Đang giữ của lần cấp', 2, 1);
  assert((await prepareTransaction(item.id, { operation: 'THU_HOI', quantity: 3, issueId: issued.id, toId: place.id })).output.error);
  assert((await prepareTransaction(item.id, { operation: 'DAO_GIAO_DICH', quantity: 0, reversalId: issued.id, reason: 'Sửa nhầm' })).output.error);
  const undo = await prepareTransaction(item.id, { operation: 'DAO_GIAO_DICH', quantity: 0, reversalId: committed.id, reason: 'Thu hồi nhầm' });
  assert(undo.draft, undo.output.error); change(undo.draft, 'Đang giữ của lần cấp', 2, 4); change(undo.draft, 'Tồn tại: Tủ IT', 8, 6);
  const reversed = ok(await as(manager, () => inventory.recordInventoryTransaction(undo.draft.values)));
  ok(await as(manager, () => inventory.recordInventoryTransaction(undo.draft.values))); assert.equal(await stock(item.id), 6);
  assert((await prepareTransaction(item.id, { operation: 'DAO_GIAO_DICH', quantity: 0, reversalId: reversed.id, reason: 'Không được đảo bản đảo' })).output.error);
});

test('reversal finds old history and rejects a negative balance before offering a draft', async () => {
  const { item, department } = await fixtureInventory();
  const received = ok(await record(item.id, { quantity: 15 }));
  for (let i = 0; i < 21; i++) ok(await record(item.id, { quantity: 1 }));
  const undo = await prepareTransaction(item.id, { operation: 'DAO_GIAO_DICH', quantity: 0, reversalId: received.id, reason: 'Nhập nhầm' });
  assert(undo.draft, undo.output.error); assert(undo.draft.detail.page > 1); change(undo.draft, 'Tồn chung', 46, 31);
  ok(await as(manager, () => inventory.recordInventoryTransaction(undo.draft.values))); assert.equal(await stock(item.id), 31);
  const extra = ok(await record(item.id, { quantity: 5 }));
  ok(await record(item.id, { operation: 'CAP_PHAT', quantity: 34, departmentId: department.id }));
  const denied = await prepareTransaction(item.id, { operation: 'DAO_GIAO_DICH', quantity: 0, reversalId: extra.id, reason: 'Nhập nhầm' });
  assert(denied.output.error); assert.equal(denied.draft, undefined); assert.equal(await stock(item.id), 2);
});

test('search retains low and inactive filters; cross-kind item edits are rejected', async () => {
  const { item, category } = await fixtureInventory();
  await db.mat_hang_vat_tu.update({ where: { id: item.id }, data: { muc_ton_toi_thieu: 10 } });
  const result = await as(manager, () => executeAiInventoryTool('search_inventory', { kind: 'TIEU_HAO', categoryId: category.id, low: true, showInactive: true, locationId: 123 }, randomUUID()));
  assert.equal(result.output.rows.length, 1); assert.equal(result.trace.filters.low, true); assert.equal(result.trace.filters.showInactive, true); assert.equal(result.trace.filters.categoryId, category.id);
  assert.equal(result.trace.filters.locationId, undefined);
  const accessory = ok(await as(manager, () => inventory.saveInventoryCategory({ code: 'PK', name: 'Phụ kiện', kind: 'PHU_KIEN', description: '', active: true }))).row;
  const denied = await as(manager, () => executeAiInventoryTool('prepare_inventory_item', { itemId: item.id, changes: { categoryId: accessory.id } }, randomUUID()));
  assert(denied.output.error); assert.equal(denied.draft, undefined);
});

test('receive and issue are drafts until confirmation, persist once with audit and current stock', async () => {
  const { item, department } = await fixtureInventory();
  transport = async () => toolReply('prepare_inventory_transaction', transactionArgs(item.id));
  const receive = ok(await ask()); assert.equal(receive.draft.kind, 'inventory-transaction'); assert.equal(receive.draft.values.quantity, 15); assert.equal(await stock(item.id), 10);
  const count = await db.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: item.id } });
  const confirmed = ok(await as(manager, () => inventory.recordInventoryTransaction(receive.draft.values)));
  ok(await as(manager, () => inventory.recordInventoryTransaction(receive.draft.values)));
  assert.equal(await stock(item.id), 25); assert.equal(await db.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: item.id } }), count+1);
  assert.equal(await db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, doi_tuong_id: `giao_dich_vat_tu:${confirmed.id}`, phan_he: 'INVENTORY' } }), 1);
  transport = async () => toolReply('prepare_inventory_transaction', transactionArgs(item.id, { operation: 'CAP_PHAT', quantity: 2, departmentId: department.id }));
  const issue = ok(await ask()); assert.equal(await stock(item.id), 25); assert(issue.draft.changes.some(r=>r.after==='23')); ok(await as(manager, () => inventory.recordInventoryTransaction(issue.draft.values))); assert.equal(await stock(item.id), 23);
  const chat = ok(await as(manager, () => getAiChat({ id: issue.conversationId }))); assert(chat.messages.some(m=>m.draft));
});

test('create and edit item keep supplied fields, initial stock and versions; preparation never writes', async () => {
  const { category } = await fixtureInventory();
  transport = async () => toolReply('prepare_inventory_item', { itemId: null, changes: { name: 'Mực mới', categoryId: category.id, unit: 'hộp', initialQuantity: 7 } });
  const result = ok(await ask()); assert.equal(result.draft.kind, 'inventory-item'); assert.equal(await db.mat_hang_vat_tu.count({ where: { company_id: manager.company_id, ten_mat_hang: 'Mực mới' } }), 0);
  const row = ok(await as(manager, () => inventory.saveInventoryItem(result.draft.values))).row;
  ok(await as(manager, () => inventory.saveInventoryItem(result.draft.values))); assert.equal(await stock(row.id), 7);
  transport = async () => toolReply('prepare_inventory_item', { itemId: row.id, changes: { notes: 'Ghi chú mới' } });
  const edit = ok(await ask()); assert.equal(edit.draft.values.unit, 'hộp'); ok(await as(manager, () => inventory.saveInventoryItem(edit.draft.values)));
  assert.equal((await db.mat_hang_vat_tu.findUniqueOrThrow({ where: { id: row.id } })).ghi_chu, 'Ghi chú mới'); assert.equal(await stock(row.id), 7);
});

test('stale stock, insufficient quantity, missing recipient and foreign source are rejected', async () => {
  const { item, department } = await fixtureInventory();
  const prepare = args => as(manager, () => executeAiInventoryTool('prepare_inventory_transaction', args, randomUUID()));
  assert((await prepare(transactionArgs(item.id, { operation: 'CAP_PHAT', quantity: 11, departmentId: department.id }))).output.error);
  assert((await prepare(transactionArgs(item.id, { operation: 'CAP_PHAT', quantity: 2 }))).output.error);
  const draft = (await prepare(transactionArgs(item.id))).draft;
  const other = (await prepare(transactionArgs(item.id, { quantity: 1 }))).draft;
  ok(await as(manager, () => inventory.recordInventoryTransaction(other.values)));
  assert.equal((await as(manager, () => inventory.recordInventoryTransaction(draft.values))).success, false);
  const badDepartment = await db.phong_ban.create({ data: { company_id: foreign.company_id, ma_phong_ban: 'OTHER', ten_phong_ban: 'Other' } });
  assert((await prepare(transactionArgs(item.id, { operation: 'CAP_PHAT', quantity: 1, departmentId: badDepartment.id }))).output.error);
  const foreignCategory = await db.loai_vat_tu.create({ data: { company_id: foreign.company_id, ma_loai: 'OTHER', ten_loai: 'Other', hang_muc: 'TIEU_HAO' } });
  const foreignItem = await db.mat_hang_vat_tu.create({ data: { company_id: foreign.company_id, loai_vat_tu_id: foreignCategory.id, ten_mat_hang: 'Private foreign', don_vi_tinh: 'lọ' } });
  const hidden = await as(manager, () => executeAiInventoryTool('get_inventory_item', { id: foreignItem.id }, randomUUID())); assert(hidden.output.error); assert(!JSON.stringify(hidden).includes('Private foreign'));
  assert((await prepare(transactionArgs(foreignItem.id))).output.error);
  assert.equal(await stock(item.id), 11);
});

test('revoked inventory permission prevents execution, confirmation and history reads', async () => {
  const { item } = await fixtureInventory();
  transport = async () => toolReply('prepare_inventory_transaction', transactionArgs(item.id));
  const result = ok(await ask()); const grant = permissions.find(p=>p.phan_he==='INVENTORY'&&p.hanh_dong==='MANAGE');
  await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: grant.id } });
  assert.equal((await as(manager, () => inventory.recordInventoryTransaction(result.draft.values))).success, false);
  assert.equal((await as(manager, () => getAiChat({ id: result.conversationId }))).success, false);
  await db.vai_tro_quyen.create({ data: { role_id: role.id, permission_id: grant.id } });
  transport = async () => { await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, permission_id: grant.id } }); return toolReply('prepare_inventory_transaction', transactionArgs(item.id)); };
  assert.equal((await ask()).success, false);
  assert.equal(await db.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: item.id } }), 1);
});

test('inventory search and detail are traced and can be followed up in the same chat', async () => {
  const { item } = await fixtureInventory(); let step = 0;
  transport = async (_, opts) => { const body = JSON.parse(opts.body); if (step++ === 0) return toolReply('search_inventory', { kind: 'TIEU_HAO', search: 'Mực Canon' }); assert(body.input.some(m=>m.type==='function_call_output'&&m.output.includes(item.ma_mat_hang))); return answer(); };
  const result = ok(await ask()); const chat = ok(await as(manager, () => getAiChat({ id: result.conversationId }))); assert(chat.messages.some(m=>m.resultLists?.some(l=>l.items.some(x=>x.includes(item.ma_mat_hang)))));
  step = 0; transport = async () => step++ === 0 ? toolReply('get_inventory_item', { id: item.id }) : answer(); ok(await ask({ conversationId: result.conversationId }));
});

const receipt = require('../../src/actions/ai-inventory-receipt.ts');
const workActions = require('../../src/actions/ai-work.ts');
const receiptLine = (extra = {}) => ({ itemId: null, name: 'Dây HDMI', unit: 'sợi', kind: 'PHU_KIEN', categoryId: null, newCategoryName: 'Cáp tín hiệu', quantity: 2, locationId: null, price: null, notes: '', ...extra });
const prepareReceipt = rows => as(manager, () => receipt.prepareInventoryReceiptWork({ requestId: randomUUID(), rows }));
const approveReceipt = work => as(manager, () => workActions.approveAiWork({ id: work.id, version: work.version }));
const receiptPlace = () => db.vi_tri.create({ data: { company_id: manager.company_id, ten_vi_tri: 'Tủ IT', loai_vi_tri: 'KHU_VUC' } });

test('receipt combines new categories/items and existing stock atomically; replay/concurrent approval imports once', async () => {
  const { item } = await fixtureInventory(), place = await receiptPlace();
  const rows = [receiptLine({ locationId: place.id }), receiptLine({ name: 'Dây DisplayPort', quantity: 3, locationId: place.id }), receiptLine({ itemId: item.id, name: '', unit: '', kind: 'TIEU_HAO', newCategoryName: '', quantity: 5 })];
  const work = ok(await prepareReceipt(rows)).work;
  assert.equal(work.kind, 'NHAP_VAT_TU'); assert(work.snapshot.ready);
  assert.equal(await db.mat_hang_vat_tu.count({ where: { company_id: manager.company_id } }), 1);
  assert.equal(await stock(item.id), 10);
  const results = await Promise.all([approveReceipt(work), approveReceipt(work)]);
  for (const result of results) { const w = ok(result).work; assert.equal(w.status, 'HOAN_TAT'); assert.equal(w.result.createdCategories, 1); assert.equal(w.result.createdItems, 2); }
  assert.equal(await db.giao_dich_vat_tu.count({ where: { company_id: manager.company_id, loai_giao_dich: 'NHAP' } }), 3);
  assert.equal(await stock(item.id), 15);
  assert.deepEqual(results[0].work.result, results[1].work.result);
  const loaded = ok(await as(manager, () => workActions.getAiWork({ id: work.id }))).work;
  assert.equal(loaded.result.rows.length, 3); assert.equal(loaded.result.rows[0].after, 2);
  assert.equal((await as(manager, () => receipt.updateInventoryReceiptWork({ id: work.id, version: work.version, rows }))).success, false);
});

test('receipt keeps incomplete proposal durable and updates missing place before one approval', async () => {
  let work = ok(await prepareReceipt([receiptLine()])).work;
  assert.equal(work.snapshot.ready, false); assert.equal((await approveReceipt(work)).success, false);
  const place = await receiptPlace();
  work = ok(await as(manager, () => receipt.updateInventoryReceiptWork({ id: work.id, version: work.version, rows: [receiptLine({ locationId: place.id })] }))).work;
  assert.equal(work.version, 2); assert(work.snapshot.ready);
  assert.equal(await db.giao_dich_vat_tu.count({ where: { company_id: manager.company_id } }), 0);
  assert.equal(ok(await approveReceipt(work)).work.status, 'HOAN_TAT');
});

test('receipt rejects changed stock and reuses concurrently created category/item after review', async () => {
  const place = await receiptPlace();
  let work = ok(await prepareReceipt([receiptLine({ locationId: place.id })])).work;
  const c = ok(await as(manager, () => inventory.saveInventoryCategory({ code: 'CABLE', name: 'Cáp tín hiệu', kind: 'PHU_KIEN', description: '', active: true }))).row;
  const item = ok(await as(manager, () => inventory.saveInventoryItem({ name: 'Dây HDMI', unit: 'sợi', categoryId: c.id, minimum: null, departmentId: null, notes: '', active: true }))).row;
  ok(await record(item.id, { quantity: 4, toId: place.id }));
  work = ok(await approveReceipt(work)).work; assert.equal(work.status, 'CAN_LAM_MOI'); assert.equal(await stock(item.id), 4);
  work = ok(await as(manager, () => workActions.refreshAiWork({ id: work.id, version: work.version }))).work;
  assert.equal(work.snapshot.rows[0].before, 4); assert.equal(work.snapshot.rows[0].createItem, false);
  const done = ok(await approveReceipt(work)).work;
  assert.equal(done.result.createdItems, 0); assert.equal(done.result.createdCategories, 0); assert.equal(await stock(item.id), 6);
});

test('receipt validates tenant, owner, duplicate lines, unit, inactive place and permission revocation', async () => {
  const { item } = await fixtureInventory(), place = await receiptPlace();
  const work = ok(await prepareReceipt([receiptLine({ locationId: place.id })])).work;
  assert.equal((await as(foreign, () => workActions.approveAiWork({ id: work.id, version: work.version }))).success, false);
  const foreignPlace = await db.vi_tri.create({ data: { company_id: foreign.company_id, ten_vi_tri: 'Khác', loai_vi_tri: 'KHU_VUC' } });
  assert.equal((await prepareReceipt([receiptLine({ locationId: foreignPlace.id })])).success, false);
  assert.equal((await prepareReceipt([receiptLine({ itemId: item.id, kind: 'TIEU_HAO', unit: 'hộp' })])).success, false);
  assert.equal((await prepareReceipt([receiptLine(), receiptLine()])).success, false);
  assert.equal((await prepareReceipt([receiptLine({ quantity: -1 })])).success, false);
  await db.vi_tri.update({ where: { id: place.id }, data: { dang_su_dung: false } });
  assert.equal((await approveReceipt(work)).success, false);
  await db.vai_tro_quyen.deleteMany({ where: { role_id: role.id, quyen: { phan_he: 'INVENTORY' } } });
  assert.equal((await approveReceipt(work)).success, false);
  assert.equal((await as(manager, () => workActions.getAiWork({ id: work.id }))).success, false);
  assert(!ok(await as(manager, () => workActions.listAiWorks())).works.some(w => w.id === work.id));
  assert.equal((await prepareReceipt([receiptLine()])).success, false);
  assert.equal(canUseBusinessTool({ permissions: { INVENTORY: 'MANAGE' } }, 'LOOKUP', 'prepare_inventory_receipt'), false);
});

test('receipt rolls back category, item, transactions and all audit rows on audit failure', async () => {
  const place = await receiptPlace(), work = ok(await prepareReceipt([receiptLine({ locationId: place.id })])).work;
  await db.$executeRawUnsafe(`CREATE FUNCTION test_receipt_audit_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${manager.company_id} AND NEW.doi_tuong_id LIKE 'giao_dich_vat_tu:%' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER test_receipt_audit_fail BEFORE INSERT ON he_thong.nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_receipt_audit_fail()');
  try {
    assert.equal((await approveReceipt(work)).success, false);
    for (const table of ['loai_vat_tu', 'mat_hang_vat_tu', 'giao_dich_vat_tu']) assert.equal(await db[table].count({ where: { company_id: manager.company_id } }), 0);
    assert.equal(ok(await as(manager, () => workActions.getAiWork({ id: work.id }))).work.status, 'CHO_DUYET');
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER test_receipt_audit_fail ON he_thong.nhat_ky_hoat_dong');
    await db.$executeRawUnsafe('DROP FUNCTION test_receipt_audit_fail()');
  }
  assert.equal(ok(await approveReceipt(work)).work.status, 'HOAN_TAT');
});

test('chat routes receipt tool to durable work and restores work reference; LOOKUP cannot call it', async () => {
  const place = await receiptPlace();
  transport = async () => toolReply('prepare_inventory_receipt', { rows: [receiptLine({ locationId: place.id })] });
  const answer = ok(await ask()); assert.equal(answer.work.kind, 'NHAP_VAT_TU');
  assert.equal(await db.mat_hang_vat_tu.count({ where: { company_id: manager.company_id } }), 0);
  const chat = ok(await as(manager, () => getAiChat({ id: answer.conversationId })));
  assert(chat.messages.some(m => m.workId === answer.work.id));
  assert.equal((await ask({ job: 'LOOKUP' })).success, false);
});

test('category depreciation work remains compatible alongside receipt work', async () => {
  const category = await db.loai_tai_san.create({ data: { company_id: manager.company_id, ma_loai: 'TEST', ten_loai: 'Thiết bị thử' } });
  const work = ok(await as(manager, () => workActions.prepareCategoryDepreciationWork({ requestId: randomUUID(), months: 60, scope: 'all_categories' }))).work;
  assert.equal(work.kind, 'KHAU_HAO_LOAI');
  assert.equal(ok(await approveReceipt(work)).work.result.changed, 1);
  assert.equal((await db.loai_tai_san.findUniqueOrThrow({ where: { id: category.id } })).khau_hao_mac_dinh_thang, 60);
  await prepareReceipt([receiptLine()]);
  assert.equal(ok(await as(manager, () => workActions.listAiWorks())).works.length, 2);
});

test('receipt work is private even to another full manager, and rejects foreign item/category inputs', async () => {
  const { item } = await fixtureInventory();
  const work = ok(await prepareReceipt([receiptLine()])).work;
  const other = (await makeAccount(manager.company_id, permissions.map(p => `${p.phan_he}:${p.hanh_dong}`))).a;
  process.env.AI_PILOT_ACCOUNT_ID = String(other.id);
  try {
    assert.equal((await as(other, () => workActions.getAiWork({ id: work.id }))).success, false);
    assert.equal((await as(other, () => workActions.approveAiWork({ id: work.id, version: work.version }))).success, false);
    assert.equal(ok(await as(other, () => workActions.listAiWorks())).works.length, 0);
  } finally { process.env.AI_PILOT_ACCOUNT_ID = String(manager.id); }
  const category = await db.loai_vat_tu.create({ data: { company_id: foreign.company_id, ma_loai: 'FOREIGN', ten_loai: 'Khác', hang_muc: 'PHU_KIEN' } });
  const foreignItem = await db.mat_hang_vat_tu.create({ data: { company_id: foreign.company_id, loai_vat_tu_id: category.id, ten_mat_hang: 'Khác', don_vi_tinh: 'cái' } });
  assert.equal((await prepareReceipt([receiptLine({ itemId: foreignItem.id })])).success, false);
  assert.equal((await prepareReceipt([receiptLine({ categoryId: category.id, newCategoryName: '' })])).success, false);
  await db.mat_hang_vat_tu.update({ where: { id: item.id }, data: { don_vi_tinh: '2' } });
  assert.equal((await prepareReceipt([receiptLine({ itemId: item.id, unit: '', kind: 'TIEU_HAO', newCategoryName: '' })])).success, false);
});
