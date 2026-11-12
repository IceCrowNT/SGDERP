/* eslint-disable @typescript-eslint/no-require-imports -- CJS loader installs request shims before importing real Server Actions. */
// Run with node --import tsx --require tsx/cjs --test against a disposable restored DB.
// Only Next request cookies/cache are simulated; JWT, session/RBAC, actions and DB are real.
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/,
  'Use the isolated assets test DB, never the operating database');
const request = new AsyncLocalStorage();
const load = Module._load;
Module._load = function (name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const assets = require('../../src/actions/asset.ts');
const locations = require('../../src/actions/location.ts');
const { deleteDepartment } = require('../../src/actions/department.ts');
const { saveRole } = require('../../src/actions/role.ts');
const { ROLE_MODULES, permissionLevels, isEditableGrant } = require('../../src/lib/role-catalog.ts');
const { RoleSchema } = require('../../src/lib/validations/role.ts');
const run = randomUUID().slice(0, 8);
let company, foreign, category, otherCategory, department, otherDepartment, person, otherPerson, place, otherPlace;
let manager, viewer, none, hr, locationManager, roleAdmin, managerRole;
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
async function identity(label, grants) {
  const permissions = await db.quyen.findMany({ where: { OR: grants.map(([phan_he, hanh_dong]) => ({ phan_he, hanh_dong, pham_vi: 'ALL' })) } });
  const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: `${label}_${run}`.toUpperCase(), ten_vai_tro: label,
    danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  const account = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `${label}_${run}`, ten_hien_thi: label, mat_khau_bam: 'not-a-login-password', danh_sach_vai_tro: { create: { role_id: role.id } } } });
  return { account, role };
}
async function createAsset(extra = {}) {
  const result = await as(manager, () => assets.saveAsset({ name: `Thiết bị ${randomUUID()}`, categoryId: category.id, ...extra }));
  assert.equal(result.success, true, result.message);
  return db.tai_san.findUniqueOrThrow({ where: { id: result.id } });
}
const input = row => ({ id: row.id, version: row.updated_at.toISOString(), name: row.ten_tai_san, categoryId: row.loai_tai_san_id,
  condition: row.tinh_trang, usage: row.hinh_thuc_su_dung, departmentId: row.phong_quan_ly_id, employeeId: row.nguoi_su_dung_id,
  locationId: row.vi_tri_id, serial: row.so_serial, model: row.hang_model, notes: row.ghi_chu });
const placeInput = row => ({ id: row.id, version: row.updated_at.toISOString(), name: row.ten_vi_tri, type: row.loai_vi_tri, parentId: row.parent_id, description: '', active: false });

before(async () => {
  const grants = await db.vai_tro_quyen.count({ where: { quyen: { phan_he: 'ASSETS' } } });
  assert.equal(grants, 0, 'Migration must not grant ASSETS');
  assert.equal(await db.tai_san.count(), 0);
  company = await db.cong_ty.create({ data: { ten_cong_ty: `Asset tests ${run}` } });
  foreign = await db.cong_ty.create({ data: { ten_cong_ty: `Other ${run}` } });
  ({ account: manager, role: managerRole } = await identity('AssetManager', [['ASSETS', 'MANAGE']]));
  ({ account: viewer } = await identity('AssetViewer', [['ASSETS', 'VIEW']]));
  ({ account: none } = await identity('AssetNone', []));
  ({ account: hr } = await identity('AssetHR', [['HR', 'MANAGE']]));
  ({ account: locationManager } = await identity('AssetLocations', [['LOCATIONS', 'MANAGE'], ['HR', 'MANAGE']]));
  ({ account: roleAdmin } = await identity('AssetRoles', [['ACCOUNTS', 'MANAGE'], ['ROLES', 'MANAGE']]));
  const result = await as(manager, () => assets.saveAssetCategory({ code: 'LAPTOP', name: 'Máy tính' }));
  assert.equal(result.success, true, result.message);
  category = await db.loai_tai_san.findUniqueOrThrow({ where: { id: result.id } });
  otherCategory = await db.loai_tai_san.create({ data: { company_id: foreign.id, ma_loai: 'LAPTOP', ten_loai: 'Other category' } });
  department = await db.phong_ban.create({ data: { company_id: company.id, ma_phong_ban: 'IT', ten_phong_ban: 'IT' } });
  otherDepartment = await db.phong_ban.create({ data: { company_id: foreign.id, ma_phong_ban: 'IT', ten_phong_ban: 'Other IT' } });
  person = await db.nhan_su.create({ data: { company_id: company.id, ho_ten: 'Person', tinh_trang_lam_viec: 'ACTIVE', so_dien_thoai: 'PRIVATE', ghi_chu: 'PRIVATE' } });
  otherPerson = await db.nhan_su.create({ data: { company_id: foreign.id, ho_ten: 'Other person', tinh_trang_lam_viec: 'ACTIVE' } });
  place = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: 'Điểm đặt', loai_vi_tri: 'DIEM_DAT_THIET_BI' } });
  otherPlace = await db.vi_tri.create({ data: { company_id: foreign.id, ten_vi_tri: 'Other place', loai_vi_tri: 'PHONG' } });
});
after(async () => { await db.$disconnect(); });

test('ASSETS catalog, strict role validation and scope never grant another module', () => {
  assert(ROLE_MODULES.some(m => m.code === 'ASSETS'));
  assert.deepEqual(permissionLevels([{ phan_he: 'ASSETS', hanh_dong: 'MANAGE', pham_vi: 'ALL' }]), { ASSETS: 'MANAGE' });
  assert.deepEqual(permissionLevels([{ phan_he: 'ASSETS', hanh_dong: 'MANAGE', pham_vi: 'DEPARTMENT' }]), {});
  assert.equal(isEditableGrant({ phan_he: 'ASSETS', hanh_dong: 'MANAGE', pham_vi: 'ALL' }), true);
  const role = { code: 'TEST', name: 'Test', description: '', permissions: { ASSETS: 'VIEW', HR: 'NONE', ACCOUNTS: 'NONE', ROLES: 'NONE', AUDIT: 'NONE' } };
  assert.equal(RoleSchema.safeParse(role).success, true);
  assert.equal(RoleSchema.safeParse({ ...role, permissions: { ...role.permissions, ASSETS: 'APPROVE' } }).success, false);
});

test('actual sessions enforce none/VIEW/MANAGE and minimal independent selectors', async () => {
  for (const actor of [null, none, hr]) {
    assert.equal((await as(actor, () => assets.getAssetCategories())).success, false);
    assert.equal((await as(actor, () => assets.saveAsset({ name: 'Denied', categoryId: category.id }))).success, false);
  }
  assert.equal((await as(viewer, () => assets.getAssetCategories())).success, true);
  assert.equal((await as(viewer, () => assets.saveAssetCategory({ code: 'NO', name: 'No' }))).success, false);
  assert.equal((await as(viewer, () => assets.saveAsset({ name: 'Denied', categoryId: category.id }))).success, false);
  assert.equal((await as(viewer, () => assets.getAssetAssignmentOptions())).success, false);
  const options = await as(manager, () => assets.getAssetAssignmentOptions());
  assert.equal(options.success, true);
  assert(!JSON.stringify(options).includes('PRIVATE'));
  assert(!options.employees.some(e => e.id === otherPerson.id));
  assert(!options.departments.some(d => d.id === otherDepartment.id));
  assert.equal((await as(manager, () => locations.getLocationOptions())).success, true);
  assert.equal((await as(manager, () => locations.getLocations())).success, false);
  assert.equal((await as(manager, () => locations.saveLocation(placeInput(place)))).success, false);
});

test('strict payload and tenant isolation protect every reference and history', async () => {
  for (const extra of [{ companyId: foreign.id }, { ma_tai_san: 'FORGED' }, { categoryId: otherCategory.id }, { departmentId: otherDepartment.id }, { locationId: otherPlace.id }, { usage: 'CA_NHAN', employeeId: otherPerson.id }, { usage: 'CA_NHAN' }, { employeeId: person.id }, { name: '   ' }]) {
    assert.equal((await as(manager, () => assets.saveAsset({ name: 'Invalid', categoryId: category.id, ...extra }))).success, false);
  }
  const row = await db.tai_san.create({ data: { company_id: foreign.id, ten_tai_san: 'Foreign asset', loai_tai_san_id: otherCategory.id } });
  for (const method of [assets.getAsset, assets.getAssetHistory]) assert.equal((await as(manager, () => method(row.id))).success, false);
  assert.equal((await as(manager, () => assets.saveAsset(input(row)))).success, false);
});

test('DB defaults, CHECKs, composite FKs, immutable identifiers and no hard deletion', async () => {
  const row = await createAsset();
  assert.match(row.ma_tai_san, /^TS-\d{6,}$/);
  assert.equal(row.tinh_trang, 'CHUA_XAC_NHAN'); assert.equal(row.hinh_thuc_su_dung, 'CHUA_XAC_DINH');
  for (const data of [{ ma_tai_san: 'FORGED' }, { id: row.id + 100000 }, { company_id: foreign.id }, { ten_tai_san: ' ' }, { hinh_thuc_su_dung: 'CA_NHAN' }, { nguoi_su_dung_id: person.id }, { loai_tai_san_id: otherCategory.id }, { phong_quan_ly_id: otherDepartment.id }, { vi_tri_id: otherPlace.id }, { hinh_thuc_su_dung: 'CA_NHAN', nguoi_su_dung_id: otherPerson.id }])
    await assert.rejects(db.tai_san.update({ where: { id: row.id }, data }));
  await assert.rejects(db.tai_san.delete({ where: { id: row.id } }));
  await assert.rejects(db.loai_tai_san.update({ where: { id: category.id }, data: { ma_loai: 'CHANGED' } }));
  const a = await createAsset({ serial: 'DUPLICATE' }), b = await createAsset({ serial: 'DUPLICATE' });
  assert.notEqual(a.id, b.id);
});

test('history is atomic, names are snapshots, no cross-object or cross-module reads', async () => {
  const row = await createAsset({ usage: 'CA_NHAN', employeeId: person.id, departmentId: department.id, locationId: place.id });
  const result = await as(viewer, () => assets.getAssetHistory(row.id));
  assert.equal(result.success, true); assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].du_lieu_moi.nguoi_su_dung.ho_ten, 'Person');
  assert(!JSON.stringify(result).includes('PRIVATE'));
  await db.nhat_ky_hoat_dong.createMany({ data: ['HR', 'LOCATIONS'].map(phan_he => ({ company_id: company.id, ten_dang_nhap: 'fixture', ho_ten: 'fixture', hanh_dong: 'UPDATE', phan_he, doi_tuong_id: `tai_san:${row.id}`, mo_ta: 'PRIVATE' })) });
  assert.equal((await as(viewer, () => assets.getAssetHistory(row.id))).rows.length, 1);
  await db.$executeRawUnsafe(`CREATE FUNCTION test_asset_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${company.id} AND NEW.phan_he = 'ASSETS' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER test_asset_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_asset_audit_failure()');
  try {
    assert.equal((await as(manager, () => assets.saveAsset({ ...input(row), notes: 'Must rollback' }))).success, false);
    assert.deepEqual(await db.tai_san.findUnique({ where: { id: row.id } }), row);
    const count = await db.loai_tai_san.count();
    assert.equal((await as(manager, () => assets.saveAssetCategory({ code: 'ROLLBACK', name: 'Rollback' }))).success, false);
    assert.equal(await db.loai_tai_san.count(), count);
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER test_asset_audit_failure ON nhat_ky_hoat_dong');
    await db.$executeRawUnsafe('DROP FUNCTION test_asset_audit_failure()');
  }
});

test('location/department references including retired assets block preview, deletion and deactivation', async () => {
  const row = await createAsset({ condition: 'NGUNG_SU_DUNG', locationId: place.id, departmentId: department.id });
  assert.equal((await as(locationManager, () => locations.getLocationDeletionPreview(place.id))).success, false);
  assert.equal((await as(locationManager, () => locations.deleteLocation({ id: place.id, version: place.updated_at.toISOString() }))).success, false);
  assert.equal((await as(locationManager, () => locations.saveLocation(placeInput(place)))).success, false);
  assert.equal((await as(hr, () => deleteDepartment(department.id))).success, false);
  await assert.rejects(db.vi_tri.delete({ where: { id: place.id } }));
  await assert.rejects(db.vi_tri.update({ where: { id: place.id }, data: { dang_su_dung: false } }));
  await assert.rejects(db.phong_ban.delete({ where: { id: department.id } }));
  assert.equal((await db.tai_san.findUnique({ where: { id: row.id } })).vi_tri_id, place.id);
});

test('concurrent allocation generates unique codes and stale updates cannot overwrite', async () => {
  const rows = await Promise.all(Array.from({ length: 8 }, () => createAsset()));
  assert.equal(new Set(rows.map(r => r.ma_tai_san)).size, rows.length);
  const results = await Promise.all(['one', 'two'].map(notes => as(manager, () => assets.saveAsset({ ...input(rows[0]), notes }))));
  assert.equal(results.filter(r => r.success).length, 1);
  const c = await db.loai_tai_san.findUniqueOrThrow({ where: { id: category.id } });
  const changes = await Promise.all(['one', 'two'].map(description => as(manager, () => assets.saveAssetCategory({ id: c.id, version: c.updated_at.toISOString(), code: c.ma_loai, name: c.ten_loai, description }))));
  assert.equal(changes.filter(r => r.success).length, 1);
});

test('allocation racing location deactivate/delete leaves no invalid or lost reference', async () => {
  for (const mode of ['deactivate', 'delete']) {
    const target = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: mode, loai_vi_tri: 'PHONG' } });
    const result = await Promise.all([
      as(manager, () => assets.saveAsset({ name: 'Race', categoryId: category.id, locationId: target.id })),
      as(locationManager, () => mode === 'delete' ? locations.deleteLocation({ id: target.id, version: target.updated_at.toISOString() }) : locations.saveLocation(placeInput(target))),
    ]);
    assert.equal(result.filter(r => r.success).length, 1);
    const linked = await db.tai_san.count({ where: { vi_tri_id: target.id } });
    const final = await db.vi_tri.findUnique({ where: { id: target.id } });
    if (linked) assert.equal(final?.dang_su_dung, true);
    else assert(mode === 'delete' ? final === null : final?.dang_su_dung === false);
  }
});

test('departed user and inactive category remain editable but cannot be newly selected', async () => {
  const row = await createAsset({ usage: 'CA_NHAN', employeeId: person.id });
  await db.nhan_su.update({ where: { id: person.id }, data: { tinh_trang_lam_viec: 'LEFT' } });
  await db.loai_tai_san.update({ where: { id: category.id }, data: { dang_su_dung: false } });
  assert.equal((await as(manager, () => assets.saveAsset({ ...input(row), notes: 'Awaiting handover' }))).success, true);
  assert.equal((await db.tai_san.findUnique({ where: { id: row.id } })).nguoi_su_dung_id, person.id);
  assert.equal((await as(manager, () => assets.saveAsset({ name: 'Invalid new', categoryId: category.id }))).success, false);
  await assert.rejects(db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Invalid direct' } }));
  await db.loai_tai_san.update({ where: { id: category.id }, data: { dang_su_dung: true } });
  assert.equal((await as(manager, () => assets.saveAsset({ name: 'Invalid new person', categoryId: category.id, usage: 'CA_NHAN', employeeId: person.id }))).success, false);
  await assert.rejects(db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Invalid person', hinh_thuc_su_dung: 'CA_NHAN', nguoi_su_dung_id: person.id } }));
});

test('list filters, totals, category counts and pagination share the authorized dataset', async () => {
  const search = `PageBatch_${run}`;
  for (let i = 0; i < 25; i++) await createAsset({ name: `${search} ${i}`, condition: i < 7 ? 'NGUNG_SU_DUNG' : 'BINH_THUONG', locationId: place.id });
  await db.tai_san.create({ data: { company_id: foreign.id, loai_tai_san_id: otherCategory.id, ten_tai_san: `${search} private` } });
  const result = await as(viewer, () => assets.getAssets({ search }));
  assert.equal(result.success, true); assert.equal(result.total, 25); assert.equal(result.remaining, 18);
  assert.equal(result.rows.length, 20); assert.equal(result.pages, 2);
  assert.equal(result.byCategory.reduce((n, c) => n + c.count, 0), result.total);
  const second = await as(viewer, () => assets.getAssets({ search, page: 2 }));
  assert.equal(second.rows.length, 5); assert(!second.rows.some(r => result.rows.some(p => p.id === r.id)));
  const retired = await as(viewer, () => assets.getAssets({ search, condition: 'NGUNG_SU_DUNG', locationId: place.id }));
  assert.equal(retired.total, 7); assert.equal(retired.remaining, 0);
  assert.equal((await as(viewer, () => assets.getAssets({ companyId: foreign.id }))).success, false);
  assert.equal((await as(none, () => assets.getAssets({}))).success, false);
  const filters = await as(viewer, () => assets.getAssetFilterOptions());
  assert.equal(filters.success, true); assert(!filters.employees.some(p => p.id === otherPerson.id));
  assert(!JSON.stringify(filters).includes('PRIVATE'));
});

test('role edits grant/revoke ASSETS while older payloads preserve it and current sessions refresh', async () => {
  const base = { id: managerRole.id, code: managerRole.ma_vai_tro, name: managerRole.ten_vai_tro, description: '', permissions: { HR: 'NONE', ACCOUNTS: 'NONE', ROLES: 'NONE', AUDIT: 'NONE' } };
  const edit = async permissions => {
    const role = await db.vai_tro.findUniqueOrThrow({ where: { id: managerRole.id } });
    const r = await as(roleAdmin, () => saveRole({ ...base, version: role.updated_at.toISOString(), permissions }));
    assert.equal(r.success, true, r.message);
  };
  await edit(base.permissions);
  assert.equal((await as(manager, () => assets.getAssetCategories())).success, true);
  await edit({ ...base.permissions, ASSETS: 'VIEW' });
  assert.equal((await as(manager, () => assets.saveAssetCategory({ code: 'DENY', name: 'Deny' }))).success, false);
  await edit({ ...base.permissions, ASSETS: 'NONE' });
  assert.equal((await as(manager, () => assets.getAssetCategories())).success, false);
  await edit({ ...base.permissions, ASSETS: 'MANAGE' });
  assert.equal((await as(manager, () => assets.saveAssetCategory({ code: 'RESTORED', name: 'Restored' }))).success, true);
  const token = await createSessionToken({ userId: manager.id, companyId: company.id, sessionVersion: manager.phien_ban_dang_nhap });
  await db.tai_khoan.update({ where: { id: manager.id }, data: { phien_ban_dang_nhap: { increment: 1 } } });
  assert.equal((await request.run(token, () => assets.getAssetCategories())).success, false);
});
