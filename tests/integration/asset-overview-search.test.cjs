/* eslint-disable @typescript-eslint/no-require-imports -- Real PostgreSQL/auth; mock only request cookies. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function (name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { searchAssetOverview } = require('../../src/actions/asset-overview-search.ts');
const as = async (user, query) => request.run(user ? await createSessionToken({ userId: user.id, companyId: user.company_id, sessionVersion: user.phien_ban_dang_nhap }) : undefined, () => searchAssetOverview(query));
let both, assets, inventory, none, target;
before(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: 'Overview search test' } });
  for (const modules of [[], ['ASSETS'], ['INVENTORY'], ['ASSETS', 'INVENTORY']]) {
    const grants = await db.quyen.findMany({ where: { phan_he: { in: modules }, hanh_dong: 'VIEW' } });
    assert.equal(grants.length, modules.length);
    const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: modules.join('_') || 'NONE', ten_vai_tro: 'Test', danh_sach_quyen: { create: grants.map(g => ({ permission_id: g.id })) } } });
    const user = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `search-${role.id}`, ten_hien_thi: 'Test', mat_khau_bam: 'disabled', danh_sach_vai_tro: { create: { role_id: role.id } } } });
    if (!modules.length) none = user; else if (modules.length === 2) both = user; else if (modules[0] === 'ASSETS') assets = user; else inventory = user;
  }
  const category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'TEST', ten_loai: 'Thiết bị' } });
  target = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Máy in Đỏ', so_serial: 'SERIAL-XYZ', hang_model: 'Model test' } });
  for (let i = 0; i < 10; i++) await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: `A Máy in ${target.ma_tai_san} ${i}` } });
  for (const hang_muc of ['TIEU_HAO', 'PHU_KIEN']) {
    const type = await db.loai_vat_tu.create({ data: { company_id: company.id, ma_loai: hang_muc, ten_loai: 'Mực và phụ kiện', hang_muc } });
    for (const active of [true, false]) await db.mat_hang_vat_tu.create({ data: { company_id: company.id, loai_vat_tu_id: type.id, ten_mat_hang: active ? 'Máy in vật tư' : 'Đã ngừng ẩn', don_vi_tinh: 'cái', dang_su_dung: active } });
  }
  const foreign = await db.cong_ty.create({ data: { ten_cong_ty: 'Foreign overview' } });
  const foreignCategory = await db.loai_tai_san.create({ data: { company_id: foreign.id, ma_loai: 'TEST', ten_loai: 'Thiết bị' } });
  await db.tai_san.create({ data: { company_id: foreign.id, loai_tai_san_id: foreignCategory.id, ten_tai_san: 'FOREIGN secret Máy in' } });
});
after(() => db.$disconnect());
test('requires session and module permission', async () => {
  for (const user of [null, none]) assert.equal((await as(user, 'máy')).success, false);
});
test('independent module permissions and tenant filtering', async () => {
  const a = await as(assets, 'may in'); assert(a.success); assert(a.rows.length); assert(a.rows.every(r => r.kind === 'asset'));
  const i = await as(inventory, 'may in'); assert(i.success); assert.equal(i.rows.length, 2); assert(i.rows.every(r => r.kind !== 'asset'));
  assert.equal((await as(both, 'FOREIGN')).rows.length, 0);
  assert.equal((await as(both, 'da ngung an')).rows.length, 0);
});
test('accent folding, serial/model search and destination URLs', async () => {
  for (const query of ['MAY IN DO', 'Đỏ', 'SERIAL-XYZ', 'model test']) {
    const r = await as(both, query); assert(r.success, r.message); assert.equal(r.rows[0].id, target.id); assert.equal(r.rows[0].href, `/assets?asset=${target.id}`);
  }
  const r = await as(inventory, 'may');
  for (const row of r.rows) assert.equal(row.href, `/inventory?kind=${row.kind}&item=${row.id}`);
});
test('exact code first and bounded results', async () => {
  const r = await as(both, target.ma_tai_san.toLowerCase()); assert(r.success); assert.equal(r.rows[0].id, target.id); assert.equal(r.rows.length, 8); assert(r.hasMore);
});
test('empty, invalid and SQL wildcard inputs', async () => {
  assert.deepEqual(await as(both, '   '), { success: true, rows: [], hasMore: false });
  for (const q of [null, {}, 'a'.repeat(121)]) assert.equal((await as(both, q)).success, false);
  for (const q of ['%', "' OR 1=1 --", '_']) assert.equal((await as(both, q)).rows.length, 0);
});
