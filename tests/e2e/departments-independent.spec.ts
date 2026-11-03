import { test, expect, type Request, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
const companies: number[] = [];
let companyId: number, foreignId: number, rootId: number, childId: number, occupiedId: number;
let manager: { dinh_danh: number; dinh_danh_cong_ty: number; phien_ban_dang_nhap: number };
let reader: typeof manager;
const actionRequest = (r: Request) => r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, request: Request, input: unknown) {
  const res = await page.request.post("/departments", {
    headers: { "Next-Action": request.headers()["next-action"], "Content-Type": request.headers()["content-type"] },
    data: JSON.stringify([input]),
  });
  return res.text();
}
test.beforeAll(async () => {
  for (const label of ["main", "other"]) companies.push((await db.cong_ty.create({ data: { ten_cong_ty: `Department independent ${label} ${randomUUID()}` } })).dinh_danh);
  [companyId] = companies;
  rootId = (await db.phong_ban.create({ data: { dinh_danh_cong_ty: companyId, ten_phong_ban: "Phòng nguồn", ma_phong_ban: "SOURCE", he_thong_nguon: "ONE_OFFICE", dinh_danh_nguon: "fixture", ten_nguon: "Tên nguồn gốc" } })).dinh_danh;
  childId = (await db.phong_ban.create({ data: { dinh_danh_cong_ty: companyId, ten_phong_ban: "Bộ phận con", ma_phong_ban: "CHILD", dinh_danh_phong_ban_cha: rootId } })).dinh_danh;
  occupiedId = (await db.phong_ban.create({ data: { dinh_danh_cong_ty: companyId, ten_phong_ban: "Phòng có nhân sự", ma_phong_ban: "OCCUPIED" } })).dinh_danh;
  await db.nhan_su.create({ data: { dinh_danh_cong_ty: companyId, dinh_danh_phong_ban: occupiedId, ho_ten: "Người đã nghỉ vẫn có hồ sơ", tinh_trang_lam_viec: "LEFT" } });
  foreignId = (await db.phong_ban.create({ data: { dinh_danh_cong_ty: companies[1], ten_phong_ban: "Phòng công ty khác", ma_phong_ban: "FOREIGN" } })).dinh_danh;
  for (const level of ["MANAGE", "VIEW"]) {
    const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "HR", hanh_dong: level } });
    const role = await db.vai_tro.create({ data: { dinh_danh_cong_ty: companyId, ma_vai_tro: level, ten_vai_tro: level, danh_sach_quyen: { create: { dinh_danh_quyen: permission.dinh_danh } } } });
    const account = await db.tai_khoan.create({ data: { dinh_danh_cong_ty: companyId, ten_dang_nhap: `dept-${randomUUID()}`, ten_hien_thi: "Kiểm thử cơ cấu", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { dinh_danh_vai_tro: role.dinh_danh } } } });
    if (level === "MANAGE") manager = account; else reader = account;
  }
});
test.afterAll(async () => {
  for (const companyId of companies) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.tai_khoan.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.nhan_su.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.vai_tro.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.phong_ban.deleteMany({ where: { dinh_danh_cong_ty: companyId } });
    await db.cong_ty.delete({ where: { dinh_danh: companyId } });
  }
  await db.$disconnect();
});

test("independent CRUD, hierarchy and server guards preserve linked data", async ({ page, context }) => {
  test.setTimeout(90000);
  await signAccount(context, manager);
  await page.goto("/departments");
  await expect(page.getByText(/1Office|Đối soát/)).toHaveCount(0);
  await page.getByRole("button", { name: "Sửa phòng ban Phòng nguồn", exact: true }).click();
  await page.getByLabel("Tên phòng ban", { exact: true }).fill("Phòng đã sửa độc lập");
  await page.getByLabel("Mã phòng ban", { exact: true }).fill("RENAMED");
  await page.getByRole("combobox", { name: "Phòng ban cấp trên" }).click();
  await expect(page.getByRole("option", { name: /Bộ phận con/ })).toHaveCount(0);
  await page.getByRole("option", { name: "Trực thuộc công ty", exact: true }).click();
  const updating = page.waitForRequest(actionRequest);
  await page.getByRole("button", { name: "Lưu phòng ban", exact: true }).click();
  const update = await updating;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = await db.phong_ban.findUniqueOrThrow({ where: { dinh_danh: rootId } });
  expect(saved).toMatchObject({ ma_phong_ban: "RENAMED", ten_phong_ban: "Phòng đã sửa độc lập", ten_nguon: "Tên nguồn gốc" });
  const valid = { id: rootId, name: saved.ten_phong_ban, code: saved.ma_phong_ban, parentId: null };
  const missingName = await replay(page, update, { ...valid, name: "   " });
  expect(missingName).toContain("Vui lòng nhập tên phòng ban");
  expect(missingName).toContain("fieldErrors");
  expect(await replay(page, update, { ...valid, code: "" })).toContain("Vui lòng nhập mã phòng ban");
  expect(await replay(page, update, { ...valid, parentId: childId })).toContain("đơn vị con");
  expect(await replay(page, update, { ...valid, parentId: rootId })).toContain("đơn vị con");
  expect(await replay(page, update, { ...valid, parentId: foreignId })).toContain("cấp trên không hợp lệ");
  expect(await replay(page, update, { ...valid, id: foreignId })).toContain("không tồn tại");
  expect(await replay(page, update, { ...valid, code: "CHILD" })).toContain("đã được sử dụng");
  expect(await replay(page, update, { ...valid, externalName: "FORGED" })).toContain('"success":false');

  await page.getByRole("button", { name: "Thêm phòng ban", exact: true }).click();
  await page.getByLabel("Tên phòng ban", { exact: true }).fill("Phòng mới để xóa");
  await page.getByLabel("Mã phòng ban", { exact: true }).fill("NEW");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const creating = page.waitForRequest(actionRequest);
  await page.getByRole("button", { name: "Lưu phòng ban", exact: true }).click();
  const create = await creating;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const added = await db.phong_ban.findUniqueOrThrow({ where: { dinh_danh_cong_ty_ma_phong_ban: { dinh_danh_cong_ty: companyId, ma_phong_ban: "NEW" } } });
  expect(await replay(page, create, { name: "Sai công ty", code: "INVALID", parentId: foreignId })).toContain("cấp trên không hợp lệ");
  expect(await replay(page, update, { id: added.dinh_danh, name: added.ten_phong_ban, code: added.ma_phong_ban, parentId: childId })).toContain('"success":true');
  // Multi-level cycle is rejected, then detach and delete the empty source-linked unit.
  expect(await replay(page, update, { ...valid, parentId: added.dinh_danh })).toContain("đơn vị con");
  expect(await replay(page, update, { id: added.dinh_danh, name: added.ten_phong_ban, code: added.ma_phong_ban, parentId: null })).toContain('"success":true');
  await db.phong_ban.update({ where: { dinh_danh: added.dinh_danh }, data: { he_thong_nguon: "ONE_OFFICE", dinh_danh_nguon: "deletable-fixture" } });
  await page.reload();
  await page.getByRole("button", { name: "Xóa phòng ban Phòng mới để xóa", exact: true }).click();
  const deleting = page.waitForRequest(actionRequest);
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  const remove = await deleting;
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await db.phong_ban.findUnique({ where: { dinh_danh: added.dinh_danh } })).toBeNull();
  expect(await replay(page, remove, rootId)).toContain("đơn vị con hoặc nhân sự");
  expect(await replay(page, remove, occupiedId)).toContain("đơn vị con hoặc nhân sự");
  expect(await replay(page, remove, foreignId)).toContain("không tồn tại");
  expect(await db.nhan_su.count({ where: { dinh_danh_cong_ty: companyId, dinh_danh_phong_ban: occupiedId } })).toBe(1);
  expect(await db.nhat_ky_hoat_dong.count({ where: { dinh_danh_cong_ty: companyId, phan_he: "DEPARTMENT", hanh_dong: "DELETE", dinh_danh_doi_tuong: String(added.dinh_danh) } })).toBe(1);

  // Concurrent reciprocal moves must not create a cycle.
  const a = await db.phong_ban.create({ data: { dinh_danh_cong_ty: companyId, ma_phong_ban: "RACE_A", ten_phong_ban: "Race A" } });
  const b = await db.phong_ban.create({ data: { dinh_danh_cong_ty: companyId, ma_phong_ban: "RACE_B", ten_phong_ban: "Race B" } });
  const race = await Promise.all([
    replay(page, update, { id: a.dinh_danh, name: a.ten_phong_ban, code: a.ma_phong_ban, parentId: b.dinh_danh }),
    replay(page, update, { id: b.dinh_danh, name: b.ten_phong_ban, code: b.ma_phong_ban, parentId: a.dinh_danh }),
  ]);
  expect(race.filter(s => s.includes('"success":true'))).toHaveLength(1);
  expect(race.filter(s => s.includes("đơn vị con"))).toHaveLength(1);

  await signAccount(context, reader);
  await page.reload();
  await expect(page.getByRole("button", { name: "Thêm phòng ban", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Sửa phòng ban|^Xóa phòng ban/ })).toHaveCount(0);
  for (const [request, value] of [[update, valid], [create, { name: "Forbidden", code: "FORBIDDEN" }], [remove, rootId]] as const)
    expect(await replay(page, request, value)).toContain("không có quyền quản lý");
  await signAccount(context, manager);
  await db.tai_khoan.update({ where: { dinh_danh: manager.dinh_danh }, data: { cho_phep_dang_nhap: false } });
  expect(await replay(page, update, valid)).toContain("Phiên đăng nhập đã hết hạn");
});
