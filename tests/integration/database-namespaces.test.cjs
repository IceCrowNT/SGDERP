/* eslint-disable @typescript-eslint/no-require-imports -- Integration test on a disposable namespace DB. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient, Prisma } = require('@prisma/client');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_namespace_test_\d+$/);
const db = new PrismaClient();
after(() => db.$disconnect());

test('all Prisma models and enum columns resolve in their PostgreSQL namespaces', async () => {
  const tables = await db.$queryRaw`SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema','public')`;
  assert.equal(tables.length, Prisma.dmmf.datamodel.models.length);
  for (const model of Prisma.dmmf.datamodel.models) {
    assert(tables.some(t => t.table_schema === model.schema && t.table_name === model.name), model.name);
    await db[model.name].findFirst();
  }
});

test('cross-namespace joins, default codes and location/asset protections survive migration', async () => {
  const stop = new Error('rollback test fixture');
  await assert.rejects(db.$transaction(async tx => {
    const company = await tx.cong_ty.create({ data: { ten_cong_ty: 'Namespace test' } });
    const department = await tx.phong_ban.create({ data: { company_id: company.id, ma_phong_ban: 'TEST', ten_phong_ban: 'Test' } });
    const room = await tx.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: 'Room', loai_vi_tri: 'PHONG' } });
    const person = await tx.nhan_su.create({ data: { company_id: company.id, department_id: department.id, ho_ten: 'Namespace fixture', tinh_trang_lam_viec: 'ACTIVE', vi_tri_lam_viec_id: room.id } });
    const category = await tx.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'PC', ten_loai: 'PC' } });
    const asset = await tx.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Fixture PC', vi_tri_id: room.id } });
    assert.match(person.ma_nhan_su, /^SDG-/); assert.match(asset.ma_tai_san, /^TS-/); assert(room.ma_vi_tri);
    const joined = await tx.tai_san.findUniqueOrThrow({ where: { id: asset.id }, include: { vi_tri: true } });
    assert.equal(joined.vi_tri.id, room.id);
    const [locked] = await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id=${company.id} FOR UPDATE`;
    assert.equal(locked.id, company.id);
    await tx.$executeRawUnsafe('SAVEPOINT protected_change');
    await assert.rejects(tx.nhan_su.update({ where: { id: person.id }, data: { ma_nhan_su: 'ILLEGAL' } }));
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT protected_change');
    await assert.rejects(tx.vi_tri.update({ where: { id: room.id }, data: { dang_su_dung: false } }));
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT protected_change');
    throw stop;
  }), error => error === stop);
});
