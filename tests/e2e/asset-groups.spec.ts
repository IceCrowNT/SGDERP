import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable asset DB only");
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const detail = (page: Page) => page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true });
const cards = (page: Page) => page.getByRole("table", { name: "Danh sách tài sản", exact: true });
const back = (page: Page) => page.getByRole("navigation", { name: "Đường dẫn tài sản" }).getByRole("button", { name: "Tài sản", exact: true }).click();
test.beforeAll(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Group UX ${run}` } });
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: "MANAGE", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: "MANAGER", ten_vai_tro: "Quản lý", danh_sach_quyen: { create: { permission_id: permission.id } } } });
  manager = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `groups-${run}`, ten_hien_thi: "Người thử", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  const person = await db.nhan_su.create({ data: { company_id: company.id, ho_ten: "Nguyễn An", tinh_trang_lam_viec: "ACTIVE" } });
  const place = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: "Bàn số 07", loai_vi_tri: "DIEM_DAT_THIET_BI" } });
  for (const [code, name, count] of [["PC", "Máy tính bàn", 25], ["LAPTOP", "Laptop", 1], ["PRN", "Máy in", 0]] as const) {
    const category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: code, ten_loai: name } });
    for (let i = 0; i < count; i++) await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: `${code}-${i}`, so_serial: code === "LAPTOP" ? "FIND-LAPTOP" : null, hinh_thuc_su_dung: i === 0 ? "CA_NHAN" : i === 1 ? "DUNG_CHUNG" : i === 2 ? "CHUA_PHAN_BO" : "CHUA_XAC_DINH", nguoi_su_dung_id: i === 0 ? person.id : null, vi_tri_id: i === 0 ? place.id : null } });
  }
});
test.afterAll(async () => db.$disconnect());

test("overview opens a table, preserves group pagination and global search crosses categories", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await expect(page.getByRole("button", { name: /^Mở nhóm/ })).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Mở tài sản/ })).toHaveCount(0);
  const group = page.getByRole("button", { name: "Mở nhóm Máy tính bàn", exact: true });
  await expect(group).toContainText("25"); await expect(group.locator(".lucide-monitor")).toHaveCount(1);
  await page.screenshot({ path: "outputs/assets-groups/overview-desktop.png" });
  await group.focus(); await group.press("Enter");
  await expect(cards(page).locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(cards(page).locator("tbody tr")).toHaveCount(5);
  await back(page); await expect(group).toBeFocused(); await group.click();
  await expect(page.getByText("25 hồ sơ · Trang 2/2", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Tìm tài sản", exact: true }).fill("FIND-LAPTOP");
  await page.getByRole("textbox", { name: "Tìm tài sản", exact: true }).press("Enter");
  await expect(cards(page).getByRole("button", { name: "Mở tài sản LAPTOP-0", exact: true })).toBeVisible();
  await expect(page.getByText("1 hồ sơ · Trang 1/1", { exact: true })).toBeVisible();
  await back(page); await group.click();
  await expect(page.getByText("25 hồ sơ · Trang 2/2", { exact: true })).toBeVisible();
});

test("people/location groups keep unknown states distinct; mobile detail returns to its group", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/assets");
  await page.getByRole("button", { name: "Theo người", exact: true }).click();
  for (const name of ["Dùng chung", "Chưa phân bổ", "Chưa rõ người sử dụng"]) await expect(page.getByRole("button", { name: `Mở nhóm ${name}`, exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Tìm nhóm tài sản", exact: true }).fill("nguyen an");
  const person = page.getByRole("button", { name: "Mở nhóm Nguyễn An", exact: true });
  await expect(page.getByRole("button", { name: /^Mở nhóm/ })).toHaveCount(1); await person.click();
  await expect(cards(page).locator("tbody tr")).toHaveCount(2);
  const trigger = cards(page).getByRole("button", { name: /^Mở tài sản/ }).first(); await trigger.click();
  await expect(detail(page).getByRole("heading", { name: /PC-0|LAPTOP-0/ })).toBeVisible();
  const box = await detail(page).boundingBox(); expect(box?.width).toBe(390);
  await detail(page).getByRole("button", { name: "Quay lại", exact: true }).click(); await expect(trigger).toBeFocused();
  await back(page); await expect(page.getByRole("textbox", { name: "Tìm nhóm tài sản", exact: true })).toHaveValue("nguyen an");
  await page.getByRole("button", { name: "Theo vị trí", exact: true }).click();
  const unknown = page.getByRole("button", { name: "Mở nhóm Chưa rõ vị trí", exact: true }); await expect(unknown).toContainText("24");
  await page.screenshot({ path: "outputs/assets-groups/overview-mobile.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "outputs/assets-groups/overview-mobile-dark.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await unknown.click(); await expect(page.getByText("24 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Vị trí", exact: true })).toHaveCount(0);
});

test("empty category preselects creation and contextual edit focuses location without losing group", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Mở nhóm Máy in", exact: true }).click();
  await expect(page.getByText("0 hồ sơ · Trang 1/1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thêm máy in", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm tài sản", exact: true });
  await expect(form.getByRole("combobox", { name: "Loại tài sản", exact: true })).toContainText("Máy in");
  await form.getByLabel("Tên tài sản", { exact: true }).fill("Máy in mới");
  await form.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(detail(page).getByRole("heading", { name: "Máy in mới", exact: true })).toBeVisible();
  await detail(page).getByRole("button", { name: "Đổi vị trí", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Sửa tài sản", exact: true });
  await expect(edit.getByRole("combobox", { name: "Vị trí", exact: true })).toBeFocused();
  await edit.getByRole("combobox", { name: "Vị trí", exact: true }).click();
  await page.getByRole("option", { name: /Bàn số 07/ }).click();
  await edit.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(detail(page).getByText("Bàn số 07", { exact: true })).toBeVisible();
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(cards(page).locator("tbody tr")).toHaveCount(1);
  await back(page); await expect(page.getByRole("button", { name: "Mở nhóm Máy in", exact: true })).toContainText("1");
});

test("group filters and scroll survive returning; contextual owner edit focuses the existing person", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  const group = page.getByRole("button", { name: "Mở nhóm Máy tính bàn", exact: true }); await group.click();
  await expect(cards(page).locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Hình thức sử dụng", exact: true }).click();
  await page.getByRole("option", { name: "Chưa xác định", exact: true }).click();
  await expect(page.getByText("22 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await expect(page.locator("main [aria-busy]").first()).toHaveAttribute("aria-busy", "false");
  await page.evaluate(() => window.scrollTo(0, 300));
  const scroll = await page.evaluate(() => window.scrollY); expect(scroll).toBeGreaterThan(0);
  await page.getByRole("navigation", { name: "Đường dẫn tài sản" }).getByRole("button", { name: "Tài sản", exact: true }).evaluate(button => (button as HTMLButtonElement).click());
  await group.click();
  await expect(page.getByText("22 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.getByRole("combobox", { name: "Hình thức sử dụng", exact: true })).toContainText("Chưa xác định");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.getByText("25 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await cards(page).getByRole("button", { name: "Mở tài sản PC-0", exact: true }).click();
  await detail(page).getByRole("button", { name: "Đổi người sử dụng", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Sửa tài sản", exact: true });
  await expect(edit.getByRole("combobox", { name: "Người sử dụng", exact: true })).toBeFocused();
  await expect(edit.getByRole("combobox", { name: "Người sử dụng", exact: true })).toContainText("Nguyễn An");
});
