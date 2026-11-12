import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Requires an isolated assets DB");
const db = new PrismaClient();
let companyId: number;
test.afterAll(async () => {
  if (companyId) {
    await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: companyId } });
    await db.tai_khoan.deleteMany({ where: { company_id: companyId } });
    await db.vai_tro.deleteMany({ where: { company_id: companyId } });
    await db.cong_ty.delete({ where: { id: companyId } });
  }
  await db.$disconnect();
});

test("ASSETS matrix defaults to none; explicit grant and revocation work on desktop/mobile", async ({ page, context }) => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Asset UI ${randomUUID()}` } });
  companyId = company.id;
  const permissions = await db.quyen.findMany({ where: { phan_he: { in: ["ROLES", "ACCOUNTS"] }, hanh_dong: "MANAGE", pham_vi: "ALL" } });
  const adminRole = await db.vai_tro.create({ data: { company_id: companyId, ma_vai_tro: "TEST_ADMIN", ten_vai_tro: "Test Admin", danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  const admin = await db.tai_khoan.create({ data: { company_id: companyId, ten_dang_nhap: `asset-ui-${randomUUID()}`, ten_hien_thi: "Test Admin", mat_khau_bam: "disabled-for-login", danh_sach_vai_tro: { create: { role_id: adminRole.id } } } });
  await signAccount(context, admin);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/roles");
  await page.getByRole("button", { name: "Thêm vai trò", exact: true }).click();
  const assetPermission = page.getByRole("combobox", { name: "Tài sản", exact: true });
  await expect(assetPermission).toHaveText("Không truy cập");
  await page.getByLabel("Mã vai trò", { exact: true }).fill("ASSET_PILOT");
  await page.getByLabel("Tên vai trò", { exact: true }).fill("Quản lý thiết bị thử");
  await assetPermission.click();
  await page.getByRole("option", { name: "Quản lý", exact: true }).click();
  await page.screenshot({ path: "outputs/assets-foundation/roles-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(async () => {
    const bounds = await page.getByRole("dialog").boundingBox();
    return Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390);
  }).toBe(true);
  await page.screenshot({ path: "outputs/assets-foundation/roles-mobile.png" });
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const role = await db.vai_tro.findUniqueOrThrow({ where: { company_id_ma_vai_tro: { company_id: companyId, ma_vai_tro: "ASSET_PILOT" } }, include: { danh_sach_quyen: { include: { quyen: true } } } });
  expect(role.danh_sach_quyen.map(p => [p.quyen.phan_he, p.quyen.hanh_dong])).toEqual([["ASSETS", "MANAGE"]]);
  await page.getByRole("button", { name: "Sửa vai trò Quản lý thiết bị thử", exact: true }).click();
  await expect(assetPermission).toHaveText("Quản lý");
  await assetPermission.click();
  await page.getByRole("option", { name: "Không truy cập", exact: true }).click();
  await page.getByRole("button", { name: "Lưu vai trò", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await db.vai_tro_quyen.count({ where: { role_id: role.id } })).toBe(0);
  expect(errors).toEqual([]);
});
