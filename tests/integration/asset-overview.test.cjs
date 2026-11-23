/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the server page with real PostgreSQL/auth and an isolated request cookie. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const { renderToStaticMarkup } = require('react-dom/server');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/);
const request = new AsyncLocalStorage(), originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  return originalLoad.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const Page = require('../../src/app/(dashboard)/asset-management/page.tsx').default;
const accounts = {};
let types = [], recentId;
async function html(account) {
  const token = account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined;
  return request.run(token, async () => renderToStaticMarkup(await Page()));
}
before(async () => {
  const run = randomUUID().slice(0, 8);
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Overview ${run}` } });
  const empty = await db.cong_ty.create({ data: { ten_cong_ty: `Empty ${run}` } });
  const perms = await db.quyen.findMany({ where: { phan_he: { in: ['ASSETS', 'INVENTORY'] }, hanh_dong: 'VIEW' } });
  assert.equal(perms.length, 2);
  for (const [name, modules] of Object.entries({ assets: ['ASSETS'], inventory: ['INVENTORY'], both: ['ASSETS', 'INVENTORY'], none: [], empty: ['ASSETS', 'INVENTORY'] })) {
    const company_id = name === 'empty' ? empty.id : company.id;
    const role = await db.vai_tro.create({ data: { company_id, ma_vai_tro: name, ten_vai_tro: name, danh_sach_quyen: { create: perms.filter(p => modules.includes(p.phan_he)).map(p => ({ permission_id: p.id })) } } });
    accounts[name] = await db.tai_khoan.create({ data: { company_id, ten_dang_nhap: `overview-${run}-${name}`, ten_hien_thi: name, mat_khau_bam: 'disabled', danh_sach_vai_tro: { create: { role_id: role.id } } } });
  }
  for (let i = 0; i < 7; i++) {
    const type = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: `OV${i}`, ten_loai: `Loại ${i}` } }); types.push(type);
    for (let j = 0; j <= i; j++) {
      const asset = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: type.id, ten_tai_san: `Thiết bị ${i}-${j}`, tinh_trang: j === 0 ? 'HONG' : 'BINH_THUONG', updated_at: new Date(Date.UTC(2026, 0, i + 1, j)) } });
      recentId = asset.id;
    }
  }
  // Active-item counts match the destination list, excluding inactive entries.
  for (const hang_muc of ['TIEU_HAO', 'PHU_KIEN']) {
    const type = await db.loai_vat_tu.create({ data: { company_id: company.id, ma_loai: hang_muc, ten_loai: hang_muc, hang_muc } });
    for (const dang_su_dung of [true, false]) await db.mat_hang_vat_tu.create({ data: { company_id: company.id, loai_vat_tu_id: type.id, ten_mat_hang: `Vật tư ${dang_su_dung}`, don_vi_tinh: 'cái', dang_su_dung } });
  }
});
after(async () => db.$disconnect());

test('no session redirects and no permission reveals neither counts nor names', async () => {
  await assert.rejects(() => html(null), /NEXT_REDIRECT/);
  const page = await html(accounts.none);
  assert(page.includes('Không thể truy cập tài sản và vật tư')); assert(!page.includes('Hạng mục quản lý')); assert(!page.includes('Thiết bị'));
});
test('asset-only overview counts all categories, limits ranking and recent rows, and exposes exact filters', async () => {
  const page = await html(accounts.assets);
  assert(page.includes('>28</span>')); assert(page.includes('aria-label="Hỏng: 7 tài sản"')); assert(page.includes('aria-label="Chưa rõ vị trí: 28 tài sản"'));
  assert(page.includes('href="/assets?condition=HONG"')); assert(page.includes('href="/assets?locationId=null"'));
  assert.equal((page.match(/aria-label="Loại \d: \d tài sản"/g) || []).length, 6);
  assert(page.includes(`href="/assets?categoryId=${types[6].id}"`)); assert(!page.includes(`href="/assets?categoryId=${types[0].id}"`));
  assert.equal((page.match(/aria-label="Mở tài sản /g) || []).length, 5); assert(page.includes(`href="/assets?asset=${recentId}"`));
  assert(!page.includes('href="/inventory')); assert(!page.includes('Chưa tải được tổng quan'));
});
test('inventory-only permission reveals two active catalog counts and no asset details', async () => {
  const page = await html(accounts.inventory);
  assert(page.includes('aria-label="Vật tư tiêu hao"')); assert(page.includes('aria-label="Phụ kiện"'));
  assert.equal((page.match(/text-3xl font-semibold tabular-nums">1<\/span>/g) || []).length, 2);
  assert(!page.includes('href="/assets')); assert(!page.includes('asset-distribution')); assert(!page.includes('Thiết bị'));
});
test('combined permissions show three entries and company scope excludes other companies', async () => {
  const page = await html(accounts.both);
  assert(page.includes('aria-label="Tài sản"')); assert(page.includes('aria-label="Vật tư tiêu hao"')); assert(page.includes('aria-label="Phụ kiện"'));
  assert(page.includes('>28</span>')); assert(!page.includes('PC19'));
  const other = await html(accounts.empty);
  assert(other.includes('Chưa có hồ sơ tài sản')); assert(!other.includes('Thiết bị 6-6')); assert(!other.includes('>28</span>'));
  assert.equal((other.match(/text-3xl font-semibold tabular-nums">0<\/span>/g) || []).length, 3);
});
