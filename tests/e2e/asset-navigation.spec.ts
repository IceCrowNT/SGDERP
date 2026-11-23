import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated DB only");
const db = new PrismaClient();
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number }, viewer: typeof manager, none: typeof manager;
let pc: number, laptop: number;
const table = (p: Page) => p.getByRole("table", { name: "Danh sách tài sản", exact: true });
const categories = (p: Page) => p.getByRole("navigation", { name: "Hạng mục quản lý" });
async function pick(p: Page, name: string) { await p.getByRole("combobox", { name: "Chọn loại tài sản", exact: true }).click(); await p.getByRole("option", { name, exact: true }).click(); }
test.beforeAll(async () => {
  const run = randomUUID().slice(0, 8), company = await db.cong_ty.create({ data: { ten_cong_ty: `Navigation ${run}` } });
  for (const role of ["manager", "viewer", "none"]) {
    const grants = role === "none" ? [] : await db.quyen.findMany({ where: { phan_he: { in: role === "manager" ? ["ASSETS", "INVENTORY"] : ["INVENTORY"] }, hanh_dong: role === "manager" ? "MANAGE" : "VIEW", pham_vi: "ALL" } });
    const r = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: role, ten_vai_tro: role, danh_sach_quyen: { create: grants.map(p => ({ permission_id: p.id })) } } });
    const u = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `${run}-${role}`, ten_hien_thi: "Kiểm tra điều hướng", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: r.id } } } });
    if (role === "manager") manager = u; else if (role === "viewer") viewer = u; else none = u;
  }
  for (const [code, name, count] of [["PC", "Máy tính bàn", 25], ["LAPTOP", "Laptop", 1], ["PRN", "Máy in", 0]] as const) {
    const c = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: code, ten_loai: name } });
    if (code === "PC") pc = c.id; if (code === "LAPTOP") laptop = c.id;
    for (let i = 0; i < count; i++) await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: c.id, ten_tai_san: `${code}-${i}`, so_serial: code === "LAPTOP" ? "UNIQUE-LAPTOP" : null } });
  }
  for (let i = 0; i < 20; i++) await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: `ZZ${i}`, ten_loai: `Thiết bị mở rộng ${i}` } });
  const kind = await db.loai_vat_tu.create({ data: { company_id: company.id, ma_loai: "MUC", ten_loai: "Mực", hang_muc: "TIEU_HAO" } });
  await db.mat_hang_vat_tu.create({ data: { company_id: company.id, loai_vat_tu_id: kind.id, ten_mat_hang: "Mực máy in", don_vi_tinh: "hộp" } });
});
test.afterAll(async () => db.$disconnect());

test("one sidebar entry and three scoped cards lead to working lists", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/asset-management");
  await expect(categories(page).getByRole("link")).toHaveCount(3);
  await expect(categories(page).getByRole("link", { name: "Tài sản", exact: true })).toContainText("26");
  await expect(categories(page).getByRole("link", { name: "Vật tư tiêu hao", exact: true })).toContainText("1");
  await expect(page.locator("aside").getByRole("link", { name: "Tài sản & vật tư", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("aside").getByRole("link", { name: "Vật tư và phụ kiện", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "outputs/ia-navigation/hub-desktop.png", fullPage: true });
  await categories(page).getByRole("link", { name: "Tài sản", exact: true }).click();
  await expect(table(page).locator("tbody tr")).toHaveCount(20);
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.screenshot({ path: "outputs/ia-navigation/list-desktop.png", fullPage: true });
  await expect(categories(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Mở nhóm/ })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Đường dẫn hạng mục" }).getByRole("link").click();
  await categories(page).getByRole("link", { name: "Phụ kiện", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Phụ kiện(?:\s+0)?$/ })).toBeVisible();
  await expect(page.locator("aside").getByRole("link", { name: "Tài sản & vật tư", exact: true })).toHaveAttribute("aria-current", "page");
});

test("category and page survive reload and Back; scoped search can explicitly search all", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets"); await pick(page, "Máy tính bàn");
  await expect(page).toHaveURL(new RegExp(`categoryId=${pc}`)); await expect(page.getByText("25 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click(); await expect(table(page).locator("tbody tr")).toHaveCount(5);
  await page.reload(); await expect(page.getByText("25 hồ sơ · Trang 2/2", { exact: true })).toBeVisible();
  await pick(page, "Laptop"); await expect(table(page).locator("tbody tr")).toHaveCount(1);
  await page.goBack(); await expect(page.getByText("25 hồ sơ · Trang 2/2", { exact: true })).toBeVisible();
  await page.goForward(); await expect(page).toHaveURL(new RegExp(`categoryId=${laptop}`)); await expect(table(page).locator("tbody tr")).toHaveCount(1);
  await pick(page, "Máy tính bàn"); await page.getByRole("textbox", { name: "Tìm tài sản", exact: true }).fill("UNIQUE-LAPTOP"); await page.getByRole("button", { name: "Tìm kiếm tài sản", exact: true }).click();
  await expect(page.getByText("Không có tài sản phù hợp", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tìm trong tất cả tài sản", exact: true }).click(); await expect(table(page).locator("tbody tr")).toHaveCount(1);
  await table(page).getByRole("button", { name: "Mở tài sản LAPTOP-0", exact: true }).click(); await expect(page).toHaveURL(/asset=\d+/);
  await page.reload(); await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toBeVisible();
});

test("empty category preselects creation; long catalog supports unaccented keyboard search", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("combobox", { name: "Chọn loại tài sản", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Tìm chọn loại tài sản", exact: true }); await search.fill("may in"); await search.press("Enter");
  await expect(page.getByText("0 hồ sơ · Trang 1/1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thêm máy in", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm tài sản", exact: true });
  await expect(form.getByRole("combobox", { name: "Loại tài sản", exact: true })).toContainText("Máy in");
  await form.getByLabel("Tên tài sản", { exact: true }).fill("Máy in kiểm chứng số đếm"); await form.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true }); await expect(detail.getByRole("heading", { name: "Máy in kiểm chứng số đếm", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("navigation", { name: "Đường dẫn hạng mục" }).getByRole("link").click();
  await expect(categories(page).getByRole("link", { name: "Tài sản", exact: true })).toContainText("27");
});

test("inventory-only user sees two cards; no permission reveals no counts or entry", async ({ page, context }) => {
  await signAccount(context, viewer); await page.goto("/asset-management"); await expect(categories(page).getByRole("link")).toHaveCount(2);
  await expect(categories(page).getByRole("link", { name: "Tài sản", exact: true })).toHaveCount(0);
  await page.goto("/assets"); await expect(page.getByText("Không thể truy cập tài sản", { exact: true })).toBeVisible();
  await context.clearCookies(); await signAccount(context, none); await page.goto("/asset-management");
  await expect(page.getByText("Không thể truy cập tài sản và vật tư", { exact: true })).toBeVisible();
  await expect(categories(page)).toHaveCount(0); await expect(page.locator("aside").getByRole("link", { name: "Tài sản & vật tư", exact: true })).toHaveCount(0);
});

test("mobile light and dark keep category controls compact and table within its scroll area", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/asset-management");
  await expect(categories(page).getByRole("link")).toHaveCount(3); await page.screenshot({ path: "outputs/ia-navigation/hub-mobile.png", fullPage: true });
  await categories(page).getByRole("link", { name: "Tài sản", exact: true }).click(); await pick(page, "Máy tính bàn"); await expect(table(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.screenshot({ path: "outputs/ia-navigation/list-mobile.png", animations: "disabled" });
  await page.evaluate(() => localStorage.setItem("theme", "dark")); await page.reload(); await expect(page.locator("html")).toHaveClass(/dark/); await expect(table(page)).toBeVisible();
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.screenshot({ path: "outputs/ia-navigation/list-mobile-dark.png", animations: "disabled" });
});
