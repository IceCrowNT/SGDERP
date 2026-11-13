import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable asset DB only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const form = (page: Page) => page.getByRole("dialog", { name: "Sửa tài sản", exact: true });
const detail = (page: Page) => page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true });
const table = (page: Page) => page.getByRole("table", { name: "Danh sách tài sản", exact: true });
const note = "Ghi chú kiểm kê dài cần mở khi đối chiếu. ".repeat(30);

test.beforeAll(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Compact assets ${run}` } });
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: "MANAGE", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: "ASSETS_MANAGER", ten_vai_tro: "Quản lý", danh_sach_quyen: { create: { permission_id: permission.id } } } });
  manager = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `assets-compact-${run}`, ten_hien_thi: "Người thử", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  for (const [code, name] of [["PC", "Máy tính bàn"], ["UNLISTED", "Thiết bị chuyên dụng mới"]]) {
    const category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: code, ten_loai: name } });
    for (let i = 0; i < (code === "PC" ? 45 : 1); i++) {
      const row = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: `${name} ${String(i).padStart(2, "0")} dùng để kiểm tra tên dài trên giao diện`, ghi_chu: note, hinh_thuc_su_dung: i === 0 ? "DUNG_CHUNG" : i === 1 ? "CHUA_PHAN_BO" : "CHUA_XAC_DINH" } });
      await db.nhat_ky_hoat_dong.create({ data: { company_id: company.id, account_id: manager.id, ten_dang_nhap: `assets-compact-${run}`, ho_ten: "Người thử", phan_he: "ASSETS", doi_tuong_id: `tai_san:${row.id}`, ten_doi_tuong: row.ten_tai_san, hanh_dong: "CREATE", mo_ta: "Tạo hồ sơ thử nghiệm", du_lieu_moi: { ten_tai_san: row.ten_tai_san, ghi_chu: note, tinh_trang: row.tinh_trang, hinh_thuc_su_dung: row.hinh_thuc_su_dung, loai_tai_san: { ten_loai: name } } } });
    }
  }
});
test.afterAll(async () => db.$disconnect());

test("compact table, category icons, keyboard filtering and collapsed details/history", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  await expect(table(page).getByRole("columnheader")).toHaveText(["Tài sản", "Người sử dụng", "Vị trí", "Tình trạng", "Thao tác"]);
  await expect(page.getByText("Hồ sơ theo bộ lọc", { exact: true })).toHaveCount(0);
  await expect(table(page).locator("tbody .lucide-monitor")).not.toHaveCount(0);
  await expect(table(page).locator("tbody .lucide-package")).toHaveCount(1);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Lọc loại tài sản", exact: true });
  await expect(picker).toBeEnabled();
  await picker.focus(); await picker.press("ArrowDown");
  await page.getByRole("combobox", { name: "Tìm lọc loại tài sản", exact: true }).fill("chuyen dung");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option").locator(".lucide-package")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Tìm lọc loại tài sản", exact: true }).press("Enter");
  await expect(page.getByText("1 hồ sơ · Trang 1/1", { exact: true })).toBeVisible();
  await table(page).getByRole("button", { name: /^Mở tài sản/ }).click();
  await expect(detail(page).getByRole("tab", { name: "Thông tin", exact: true })).toHaveAttribute("data-state", "active");
  await expect(detail(page).getByText(note, { exact: true })).not.toBeVisible();
  await detail(page).locator("summary").filter({ hasText: "Ghi chú" }).click();
  await expect(detail(page).getByText(note, { exact: true })).toBeVisible();
  await detail(page).getByRole("tab", { name: "Lịch sử", exact: true }).click();
  const history = detail(page).getByRole("region", { name: "Lịch sử tài sản" });
  await expect(history.locator("summary")).toContainText("Tạo hồ sơ");
  await expect(history.getByText(note, { exact: true })).not.toBeVisible();
  await history.locator("summary").focus(); await history.locator("summary").press("Enter");
  await expect(history.getByText(note, { exact: true })).toBeVisible();
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(picker).toContainText("Thiết bị chuyên dụng mới");
  await page.getByRole("button", { name: /^Bỏ lọc loại:/ }).click();
  await expect(page.getByText("46 hồ sơ · Trang 1/3", { exact: true })).toBeVisible();
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.screenshot({ animations: "disabled", path: "outputs/assets-compact/desktop.png" });
});

test("editing keeps pagination and scroll; hidden validation errors reopen and focus additional fields", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("46 hồ sơ · Trang 2/3", { exact: true })).toBeVisible();
  const trigger = table(page).getByRole("button", { name: /^Mở tài sản/ }).nth(8);
  await trigger.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  await trigger.click(); await detail(page).getByRole("button", { name: "Sửa tài sản", exact: true }).click();
  await expect(form(page).getByLabel("Serial / Service tag", { exact: true })).not.toBeVisible();
  await form(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await form(page).getByLabel("Serial / Service tag", { exact: true }).fill("x".repeat(256));
  await form(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await form(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(form(page).getByText("Tối đa 255 ký tự", { exact: true })).toBeVisible();
  await expect(form(page).getByLabel("Serial / Service tag", { exact: true })).toBeFocused();
  await form(page).getByLabel("Serial / Service tag", { exact: true }).fill("COMPACT-TEST");
  await form(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(detail(page).getByText("COMPACT-TEST", { exact: true })).toBeVisible();
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("46 hồ sơ · Trang 2/3", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await db.tai_san.count({ where: { company_id: manager.company_id, so_serial: "COMPACT-TEST" } })).toBe(1);
});

test("mobile table, filters and detail survive light/dark and viewport changes", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/assets");
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  const list = table(page);
  await expect(list.locator("tbody tr")).toHaveCount(20);
  await expect(table(page)).toBeVisible();
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Hình thức sử dụng", exact: true }).click();
  await page.getByRole("option", { name: "Dùng chung", exact: true }).click();
  await expect(list.locator("tbody tr")).toHaveCount(2);
  await expect(list.getByText("Dùng chung", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.screenshot({ animations: "disabled", path: "outputs/assets-compact/mobile-light.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ animations: "disabled", path: "outputs/assets-compact/mobile-dark.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const button = list.getByRole("button", { name: /^Mở tài sản/ }).first();
  const label = await button.getAttribute("aria-label");
  await button.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(list.getByRole("button", { name: label!, exact: true })).toBeFocused();
});
