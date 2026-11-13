import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
import { refreshOfficeData } from "../helpers/office-3d";
import { resolveBuilding, BuildingMappingSchema } from "../../src/lib/office-3d/building-mapping";
const db = new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL ?? ""), "Isolated database required");
test.describe.configure({ mode: "serial" });
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let viewer: Account, hr: Account, assetsOnly: Account, locations: Account, foreign: Account;
let roomName: string, company: number, roleId: number, assetGrant: number, seat: number, roomId: number;
let expectedPeople: number, expectedAssets: number;
const run = randomUUID().slice(0, 6), personName = `Người thử panel ${run}`;
const assetName = `Laptop chọn nhanh ${run}`, directName = `Thiết bị chung ${run}`, unmappedName = `Thiết bị ngoài hình ${run}`;
const foreignName = `Tài sản khác công ty ${run}`, unassignedName = `Chưa gán ${run}`;
const url = "/office-3d?floor=2&room=t2_hcns_pc";
const panel = (page: Page) => page.getByRole("region", { name: "Thông tin phòng", exact: true });
test.beforeAll(async () => {
  mkdirSync("outputs/room-panel", { recursive: true });
  const map = JSON.parse(readFileSync("var/office-3d/hcns.json", "utf8"));
  company = map.companyId; roomId = map.roomId;
  seat = map.points.find((p: { key: string }) => p.key === "hcns-07").locationId;
  roomName = (await db.vi_tri.findUniqueOrThrow({ where: { id: roomId } })).ten_vi_tri;
  async function account(label: string, modules: string[], company_id = company) {
    const permissions = await db.quyen.findMany({ where: { pham_vi: "ALL", phan_he: { in: modules }, hanh_dong: "VIEW" } });
    const role = await db.vai_tro.create({ data: { company_id, ma_vai_tro: `RP-${label}-${run}`, ten_vai_tro: "Kiểm thử phòng", danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
    if (label === "all") { roleId = role.id; assetGrant = permissions.find(p => p.phan_he === "ASSETS")!.id; }
    return db.tai_khoan.create({ data: { company_id, ten_dang_nhap: `rp-${label}-${run}`, ten_hien_thi: "Kiểm thử phòng", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  }
  viewer = await account("all", ["LOCATIONS", "HR", "ASSETS"]);
  hr = await account("hr", ["LOCATIONS", "HR"]);
  assetsOnly = await account("assets", ["LOCATIONS", "ASSETS"]);
  locations = await account("locations", ["LOCATIONS"]);
  const other = await db.cong_ty.create({ data: { ten_cong_ty: `Panel khác ${run}` } });
  foreign = await account("foreign", ["LOCATIONS", "HR", "ASSETS"], other.id);
  const department = await db.phong_ban.findFirstOrThrow({ where: { company_id: company } });
  await db.nhan_su.create({ data: { company_id: company, department_id: department.id, ho_ten: personName, chuc_vu: "Chức vụ chỉ mở chi tiết", vi_tri_lam_viec_id: seat, tinh_trang_lam_viec: "ACTIVE" } });
  const extra = await db.vi_tri.create({ data: { company_id: company, parent_id: roomId, ten_vi_tri: `Góc thử ${run}`, loai_vi_tri: "KHU_VUC" } });
  const child = await db.vi_tri.create({ data: { company_id: company, parent_id: extra.id, ten_vi_tri: "Kệ thiết bị", loai_vi_tri: "DIEM_DAT_THIET_BI" } });
  const pc = await db.loai_tai_san.create({ data: { company_id: company, ma_loai: `RP_PC_${run.toUpperCase()}`, ten_loai: "PC kiểm thử" } });
  const otherType = await db.loai_tai_san.create({ data: { company_id: company, ma_loai: `RP_LAP_${run.toUpperCase()}`, ten_loai: "Laptop kiểm thử" } });
  for (let i = 0; i < 6; i++) await db.tai_san.create({ data: { company_id: company, loai_tai_san_id: pc.id, ten_tai_san: i < 2 ? `Tên trùng ${run}` : `PC panel ${run} ${i}`, vi_tri_id: seat, tinh_trang: i === 0 ? "HONG" : "BINH_THUONG" } });
  for (const [name, locationId] of [[assetName, seat], [directName, roomId], [unmappedName, child.id], [unassignedName, null]] as const)
    await db.tai_san.create({ data: { company_id: company, loai_tai_san_id: otherType.id, ten_tai_san: name, vi_tri_id: locationId, tinh_trang: "CHUA_XAC_NHAN" } });
  const category = await db.loai_tai_san.create({ data: { company_id: other.id, ma_loai: "RP", ten_loai: "Khác" } });
  await db.tai_san.create({ data: { company_id: other.id, loai_tai_san_id: category.id, ten_tai_san: foreignName } });
  const mapping = BuildingMappingSchema.parse(JSON.parse(readFileSync("var/office-3d/building.json", "utf8")));
  const rows = await db.vi_tri.findMany({ where: { company_id: company } });
  const ids = [...resolveBuilding(mapping, rows)!.rooms.find(r => r.key === "t2_hcns_pc")!.locationIds];
  expectedPeople = await db.nhan_su.count({ where: { company_id: company, tinh_trang_lam_viec: "ACTIVE", vi_tri_lam_viec_id: { in: ids } } });
  expectedAssets = await db.tai_san.count({ where: { company_id: company, vi_tri_id: { in: ids } } });
});
test.afterAll(() => db.$disconnect());
async function open(page: Page, context: Parameters<typeof signAccount>[0], account = viewer) {
  await signAccount(context, account);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({ timeout: 90000 });
  if (await page.locator("#building-information").isHidden()) await page.getByRole("button", { name: "Hiện bảng thông tin", exact: true }).click();
}
test("compact tabs count real room records; person and asset links focus the right point on one Canvas", async ({ page, context }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  const errors: string[] = []; let documents = 0;
  page.on("pageerror", e => errors.push(e.message)); page.on("request", r => { if (r.resourceType() === "document") documents++; });
  await open(page, context);
  const original = await page.locator("canvas").elementHandle();
  await expect(panel(page).getByRole("tab", { name: `Nhân sự · ${expectedPeople}`, exact: true })).toBeVisible();
  await expect(panel(page).getByRole("tab", { name: `Tài sản · ${expectedAssets}`, exact: true })).toBeVisible();
  await expect(page.locator("#building-information").getByRole("heading", { name: roomName, exact: true })).toHaveCount(1);
  await expect(panel(page).getByText("Chức vụ chỉ mở chi tiết", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Danh sách phòng", exact: true })).toBeHidden();
  await expect(panel(page).locator('a[href^="/employees"]')).toHaveCount(0);
  await page.screenshot({ path: "outputs/room-panel/overview-people.png", fullPage: true });
  await panel(page).getByRole("button", { name: `Xem vị trí của ${personName}`, exact: true }).click();
  await expect(page).toHaveURL(/point=hcns-07/);
  await expect(page.getByRole("region", { name: "Chi tiết vị trí", exact: true }).getByRole("heading", { name: personName, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Chi tiết vị trí", exact: true }).getByRole("heading", { name: personName, exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Trở lại tầng 2", exact: true }).click();
  await panel(page).getByRole("tab", { name: /^Tài sản/ }).click();
  await expect(panel(page).getByText(directName, { exact: true })).toBeVisible();
  await expect(panel(page).getByText(unmappedName, { exact: true })).toBeVisible();
  await expect(panel(page).getByText(unassignedName, { exact: true })).toHaveCount(0);
  expect(await page.content()).not.toContain(foreignName);
  await expect(panel(page).getByText(`Tên trùng ${run}`, { exact: true })).toHaveCount(2);
  await expect(panel(page).getByRole("button", { name: /Xem vị trí tài sản Tên trùng/ }).first()).toContainText(/TS-\d+/);
  await page.screenshot({ path: "outputs/room-panel/overview-assets.png", fullPage: true });
  await panel(page).getByRole("button", { name: `Xem vị trí tài sản ${assetName}`, exact: true }).click();
  await expect(page).toHaveURL(/point=hcns-07/);
  await expect(page.getByRole("region", { name: "Tài sản tại vị trí", exact: true }).locator('[aria-current="true"]')).toContainText(assetName);
  await expect(page.getByRole("region", { name: "Tài sản tại vị trí", exact: true }).getByRole("listitem").first()).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("region", { name: "Chi tiết vị trí", exact: true }).getByRole("heading", { name: assetName, exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Gán tài sản", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "outputs/room-panel/asset-focused.png", fullPage: true });
  await page.getByRole("button", { name: "Trở lại tầng 2", exact: true }).click();
  await expect(panel(page).getByRole("tab", { name: /^Tài sản/ })).toHaveAttribute("data-state", "active");
  await panel(page).getByRole("button", { name: "Vào phòng", exact: true }).click();
  await expect(page).toHaveURL(/point=hcns-01/);
  await expect(page.getByRole("region", { name: "Chi tiết vị trí", exact: true }).getByRole("heading", { name: "Vị trí 01", exact: true })).toBeVisible();
  await page.screenshot({ path: "outputs/room-panel/normal-entry-after-focus.png", fullPage: true });
  expect(await original!.evaluate(el => el === document.querySelector("canvas") && el.isConnected)).toBe(true);
  expect(documents).toBe(1); expect(errors).toEqual([]);
});
test("permissions hide unauthorized data and counts; revocation refreshes tabs; other company gets no building data", async ({ page, context }) => {
  for (const [account, peopleAllowed, assetsAllowed] of [[locations, false, false], [hr, true, false], [assetsOnly, false, true]] as const) {
    await open(page, context, account);
    await expect(panel(page).getByRole("tab", { name: /^Nhân sự/ })).toHaveCount(peopleAllowed ? 1 : 0);
    await expect(panel(page).getByRole("tab", { name: /^Tài sản/ })).toHaveCount(assetsAllowed ? 1 : 0);
    if (!peopleAllowed) expect(await page.content()).not.toContain(personName);
    if (!assetsAllowed) expect(await page.content()).not.toContain(assetName);
  }
  await open(page, context);
  await panel(page).getByRole("tab", { name: /^Tài sản/ }).click();
  await db.vai_tro_quyen.delete({ where: { role_id_permission_id: { role_id: roleId, permission_id: assetGrant } } });
  try {
    await refreshOfficeData(page);
    await expect(panel(page).getByRole("tab", { name: /^Tài sản/ })).toHaveCount(0);
    await expect(panel(page).getByRole("tab", { name: /^Nhân sự/ })).toHaveAttribute("data-state", "active");
    await expect(panel(page)).not.toContainText(assetName);
  } finally { await db.vai_tro_quyen.create({ data: { role_id: roleId, permission_id: assetGrant } }); }
  await signAccount(context, foreign); await page.goto(url);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(await page.content()).not.toContain(personName); expect(await page.content()).not.toContain(assetName);
});
test("mobile dark mode, unmapped records and keyboard room switching remain usable", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, context);
  await page.getByRole("button", { name: "Mở rộng không gian 3D", exact: true }).click();
  await panel(page).getByRole("tab", { name: /^Tài sản/ }).click();
  const row = panel(page).locator("details").filter({ has: page.getByText(unmappedName, { exact: true }) }).last();
  await row.locator("summary").click();
  await expect(row).toContainText("chưa có điểm chọn");
  await expect(row).toContainText(`Góc thử ${run} / Kệ thiết bị`);
  await expect(page).toHaveURL(url);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "outputs/room-panel/mobile-dark.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const chooser = page.locator("summary", { hasText: "Đổi phòng" });
  await chooser.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Danh sách phòng", exact: true })).toBeVisible();
  const destination = page.getByRole("button", { name: /Xem phòng Phòng Kế toán/ });
  await destination.click(); await expect(page.locator("#building-information").getByRole("heading", { name: "Phòng Kế toán", exact: true })).toBeVisible();
});
test("WebGL loss opens room navigation and retains counts and records", async ({ page, context }) => {
  await open(page, context);
  await page.locator("canvas").evaluate(el => el.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
  await expect(page.getByText(/Không thể hiển thị 3D/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Danh sách phòng", exact: true })).toBeVisible();
  await expect(panel(page).getByRole("tab", { name: `Tài sản · ${expectedAssets}`, exact: true })).toBeVisible();
  await panel(page).getByRole("tab", { name: /^Tài sản/ }).click();
  await expect(panel(page).getByText(directName, { exact: true })).toBeVisible();
});
