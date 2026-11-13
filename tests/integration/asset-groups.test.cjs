/* eslint-disable @typescript-eslint/no-require-imports -- Install Next request shims before loading real actions. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const assets = require('../../src/actions/asset.ts');
const run = randomUUID().slice(0, 8);
let company, foreign, manager, viewer, none, category, emptyCategory, person, place, row, viewerRole;
const as = async (actor, fn) => request.run(actor ? await createSessionToken({ userId: actor.id, companyId: actor.company_id, sessionVersion: actor.phien_ban_dang_nhap }) : undefined, fn);
before(async () => {
  company = await db.cong_ty.create({ data: { ten_cong_ty: `Asset groups ${run}` } });
  foreign = await db.cong_ty.create({ data: { ten_cong_ty: `Foreign groups ${run}` } });
  for (const level of ['MANAGE', 'VIEW', 'NONE']) {
    const permission = level === 'NONE' ? null : await db.quyen.findFirstOrThrow({ where: { phan_he: 'ASSETS', hanh_dong: level, pham_vi: 'ALL' } });
    const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: level, ten_vai_tro: level, danh_sach_quyen: { create: permission ? [{ permission_id: permission.id }] : [] } } });
    const account = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `groups-${level}-${run}`, ten_hien_thi: level, mat_khau_bam: 'disabled', danh_sach_vai_tro: { create: { role_id: role.id } } } });
    if (level === 'MANAGE') manager = account;
    if (level === 'VIEW') { viewer = account; viewerRole = role; }
    if (level === 'NONE') none = account;
  }
  category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'PC', ten_loai: 'Máy tính' } });
  emptyCategory = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'EMPTY', ten_loai: 'Loại rỗng' } });
  person = await db.nhan_su.create({ data: { company_id: company.id, ho_ten: 'Người nhận', tinh_trang_lam_viec: 'ACTIVE', ghi_chu: 'PRIVATE_HR' } });
  place = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: 'Bàn đặt', loai_vi_tri: 'DIEM_DAT_THIET_BI' } });
  for (let i = 0; i < 25; i++) {
    const r = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: `DEVICE_SECRET_${i}`, ghi_chu: 'PRIVATE_NOTES', so_serial: 'PRIVATE_SERIAL', hinh_thuc_su_dung: i < 2 ? 'CA_NHAN' : i === 2 ? 'DUNG_CHUNG' : i === 3 ? 'CHUA_PHAN_BO' : 'CHUA_XAC_DINH', nguoi_su_dung_id: i < 2 ? person.id : null, vi_tri_id: i === 0 ? place.id : null, tinh_trang: i === 4 ? 'NGUNG_SU_DUNG' : 'CHUA_XAC_NHAN' } });
    if (i === 0) row = r;
  }
  const c = await db.loai_tai_san.create({ data: { company_id: foreign.id, ma_loai: 'PRIVATE', ten_loai: 'FOREIGN_CATEGORY' } });
  await db.tai_san.create({ data: { company_id: foreign.id, loai_tai_san_id: c.id, ten_tai_san: 'FOREIGN_ASSET' } });
});
after(() => db.$disconnect());

test('group summaries are complete beyond one page and each group drills into the same authorized count', async () => {
  const result = await as(viewer, assets.getAssetOverview);
  assert.equal(result.success, true); assert.equal(result.total, 25); assert.equal(result.canManage, false);
  for (const key of ['byCategory', 'byEmployee', 'byLocation']) {
    assert.equal(result[key].reduce((sum, group) => sum + group.count, 0), 25);
    for (const group of result[key]) {
      const list = await as(viewer, () => assets.getAssets(group.query));
      assert.equal(list.success, true); assert.equal(list.total, group.count);
    }
  }
  assert.equal(result.byCategory.find(g => g.query.categoryId === emptyCategory.id).count, 0);
  assert.equal(result.byLocation.find(g => g.query.locationId === null).count, 24);
  assert.equal(result.byEmployee.find(g => g.query.usage === 'DUNG_CHUNG').count, 1);
  assert.equal(result.byEmployee.find(g => g.query.usage === 'CHUA_PHAN_BO').count, 1);
  assert.equal(result.byEmployee.find(g => g.query.usage === 'CHUA_XAC_DINH').count, 21);
  for (const secret of ['PRIVATE_HR', 'PRIVATE_NOTES', 'PRIVATE_SERIAL', 'DEVICE_SECRET', 'FOREIGN']) assert(!JSON.stringify(result).includes(secret));
});

test('group reads and null-location filtering enforce session, permission and company scope', async () => {
  for (const actor of [null, none]) assert.equal((await as(actor, assets.getAssetOverview)).success, false);
  assert.equal((await as(manager, () => assets.getAssets({ locationId: null }))).total, 24);
  assert.equal((await as(viewer, () => assets.getAssets({ companyId: foreign.id, locationId: null }))).success, false);
  assert.equal((await as(viewer, () => assets.getAssets({ locationId: 'null' }))).success, false);
  await db.vai_tro_quyen.deleteMany({ where: { role_id: viewerRole.id } });
  assert.equal((await as(viewer, assets.getAssetOverview)).success, false);
});

test('summary reflects saved reassignment/location changes and keeps unknown usage separate', async () => {
  const saved = await as(manager, () => assets.saveAsset({ id: row.id, version: row.updated_at.toISOString(), name: row.ten_tai_san, categoryId: category.id, usage: 'DUNG_CHUNG', employeeId: null, locationId: null }));
  assert.equal(saved.success, true, saved.message);
  const result = await as(manager, assets.getAssetOverview);
  assert.equal(result.total, 25);
  assert.equal(result.byEmployee.find(g => g.query.employeeId === person.id).count, 1);
  assert.equal(result.byEmployee.find(g => g.query.usage === 'DUNG_CHUNG').count, 2);
  assert.equal(result.byLocation.length, 1); assert.equal(result.byLocation[0].count, 25);
});
