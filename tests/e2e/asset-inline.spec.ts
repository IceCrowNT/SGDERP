import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable asset DB only");
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const table = (page: Page) => page.getByRole("table", { name: "Danh sách tài sản", exact: true });
const back = (page: Page) => page.getByRole("navigation", { name: "Đường dẫn tài sản" }).getByRole("button", { name: "Tài sản", exact: true }).click();
test.beforeAll(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Inline UX ${run}` } });
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: "MANAGE", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: "MANAGER", ten_vai_tro: "Quản lý", danh_sach_quyen: { create: { permission_id: permission.id } } } });
  manager = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `inline-${run}`, ten_hien_thi: "Người thử", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  const person = await db.nhan_su.create({ data: { company_id: company.id, ho_ten: "Nguyễn An", tinh_trang_lam_viec: "ACTIVE" } });
  const place = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: "Bàn số 07", loai_vi_tri: "DIEM_DAT_THIET_BI" } });
  for (const [code, name, count] of [["PC", "Máy tính bàn", 25], ["LAPTOP", "Laptop", 1], ["PRN", "Máy in", 0]] as const) {
    const category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: code, ten_loai: name } });
    for (let i = 0; i < count; i++) await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: `${code}-${i}`, ghi_chu: "Ghi chú cần giữ", hang_model: "Model cần giữ", so_serial: code === "LAPTOP" ? "FIND-LAPTOP" : null, hinh_thuc_su_dung: i === 0 ? "CA_NHAN" : i === 1 ? "DUNG_CHUNG" : i === 2 ? "CHUA_PHAN_BO" : "CHUA_XAC_DINH", nguoi_su_dung_id: i === 0 ? person.id : null, vi_tri_id: i === 0 ? place.id : null } });
  }
});
test.afterAll(async () => db.$disconnect());

async function openGroup(page: Page) {
  await page.goto("/assets");
  await page.getByRole("button", { name: "Mở nhóm Máy tính bàn", exact: true }).click();
  await expect(table(page).locator("tbody tr")).toHaveCount(20);
}
const editor = (page: Page) => page.locator("tr[data-inline-editor]");

test("edit cells validates person, saves all visible fields and preserves hidden data with audit", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await expect(page.getByRole("button", { name: "Thẻ", exact: true })).toHaveCount(0);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-24", exact: true }).click();
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toBeFocused();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("PC sửa tại dòng");
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Tìm tài sản", exact: true })).toBeDisabled();
  await editor(page).getByRole("combobox", { name: "Hình thức sử dụng", exact: true }).click();
  await page.getByRole("option", { name: "Cá nhân", exact: true }).click();
  await editor(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(editor(page).getByText("Chọn người sử dụng", { exact: true }).last()).toBeVisible();
  await editor(page).getByRole("combobox", { name: "Người sử dụng", exact: true }).click();
  await page.getByRole("combobox", { name: "Tìm người sử dụng", exact: true }).fill("nguyen an");
  await page.getByRole("option", { name: /Nguyễn An/ }).click();
  await editor(page).getByRole("combobox", { name: "Vị trí", exact: true }).click();
  await page.getByRole("option", { name: "Bàn số 07", exact: true }).click();
  await editor(page).getByRole("combobox", { name: "Tình trạng", exact: true }).click();
  await page.getByRole("option", { name: "Hỏng", exact: true }).click();
  await page.screenshot({ path: "outputs/assets-inline/edit-desktop.png" });
  await editor(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(table(page).getByRole("button", { name: "Mở tài sản PC sửa tại dòng", exact: true })).toBeVisible();
  const row = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC sửa tại dòng" } });
  expect(row.tinh_trang).toBe("HONG"); expect(row.nguoi_su_dung_id).not.toBeNull(); expect(row.vi_tri_id).not.toBeNull();
  expect(row.ghi_chu).toBe("Ghi chú cần giữ"); expect(row.hang_model).toBe("Model cần giữ"); expect(row.so_serial).toBeNull();
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, doi_tuong_id: `tai_san:${row.id}`, hanh_dong: "UPDATE" } })).toBe(1);
  await back(page); await expect(page.getByRole("button", { name: "Mở nhóm Máy tính bàn", exact: true })).toContainText("25");
});

test("cancel and stale/network errors preserve drafts without overwriting newer changes", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-23", exact: true }).click();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("Bản nháp sẽ hủy");
  await page.getByRole("link", { name: "Tổng quan", exact: true }).click();
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Bản nháp sẽ hủy");
  await editor(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(table(page).getByRole("button", { name: "Mở tài sản PC-23", exact: true })).toBeFocused();
  await table(page).getByRole("button", { name: "Sửa nhanh PC-23", exact: true }).click();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("Bản nháp cần giữ");
  const before = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC-23" } });
  await db.tai_san.update({ where: { id: before.id }, data: { ghi_chu: "Cập nhật từ phiên khác", updated_at: new Date(before.updated_at.getTime() + 1000) } });
  await editor(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Hồ sơ đã thay đổi" })).toBeVisible();
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Bản nháp cần giữ");
  expect((await db.tai_san.findUniqueOrThrow({ where: { id: before.id } })).ten_tai_san).toBe("PC-23");
  await editor(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await page.reload(); await page.getByRole("button", { name: "Mở nhóm Máy tính bàn", exact: true }).click();
  await table(page).getByRole("button", { name: "Sửa nhanh PC-23", exact: true }).click();
  await expect(editor(page).getByRole("button", { name: "Lưu", exact: true })).toBeEnabled();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("PC lưu lại sau lỗi mạng");
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort("failed") : route.continue();
  await page.route("**/assets", block);
  await editor(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Không kết nối" })).toBeVisible();
  await page.unroute("**/assets", block);
  await editor(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  const saved = await db.tai_san.findUniqueOrThrow({ where: { id: before.id } });
  expect(saved.ten_tai_san).toBe("PC lưu lại sau lỗi mạng"); expect(saved.ghi_chu).toBe("Cập nhật từ phiên khác");
});

test("mobile table stays within viewport, catalog retry keeps input and VIEW has no inline edit", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await openGroup(page);
  await expect(table(page)).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort("failed") : route.continue();
  await page.route("**/assets", block);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-22", exact: true }).click();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("Giữ nội dung khi tải lỗi");
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được danh mục" })).toBeVisible();
  await page.unroute("**/assets", block); await page.getByRole("button", { name: "Tải lại danh mục", exact: true }).click();
  await expect(editor(page).getByRole("button", { name: "Lưu", exact: true })).toBeEnabled();
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Giữ nội dung khi tải lỗi");
  await page.screenshot({ path: "outputs/assets-inline/edit-mobile.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "outputs/assets-inline/edit-mobile-dark.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await editor(page).getByRole("button", { name: "Hủy", exact: true }).click();
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: "VIEW", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: manager.company_id, ma_vai_tro: "VIEWER", ten_vai_tro: "Xem", danh_sach_quyen: { create: { permission_id: permission.id } } } });
  const viewer = await db.tai_khoan.create({ data: { company_id: manager.company_id, ten_dang_nhap: `inline-view-${run}`, ten_hien_thi: "Viewer", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  await signAccount(context, viewer); await openGroup(page);
  await expect(table(page).getByRole("button", { name: /^Sửa nhanh/ })).toHaveCount(0);
  await expect(table(page).getByRole("columnheader")).toHaveCount(4);
});

test("Enter saves the row and moving out of a person group updates the table and counts", async ({ page, context }) => {
  const original = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC-0" } });
  const count = await db.tai_san.count({ where: { company_id: manager.company_id, nguoi_su_dung_id: original.nguoi_su_dung_id } });
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Theo người", exact: true }).click();
  await page.getByRole("button", { name: "Mở nhóm Nguyễn An", exact: true }).click();
  await table(page).getByRole("button", { name: "Sửa nhanh PC-0", exact: true }).click();
  await editor(page).getByRole("combobox", { name: "Hình thức sử dụng", exact: true }).click();
  await page.getByRole("option", { name: "Dùng chung", exact: true }).click();
  await expect(editor(page).getByRole("combobox", { name: "Người sử dụng", exact: true })).toHaveCount(0);
  await expect(editor(page).getByRole("button", { name: "Lưu", exact: true })).toBeEnabled();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).press("Enter");
  await expect(editor(page)).toHaveCount(0);
  await expect(table(page).locator("tbody tr")).toHaveCount(count - 1);
  await expect(table(page).getByRole("button", { name: "Mở tài sản PC-0", exact: true })).toHaveCount(0);
  await back(page); await expect(page.getByRole("button", { name: "Mở nhóm Nguyễn An", exact: true })).toContainText(String(count - 1));
  const saved = await db.tai_san.findUniqueOrThrow({ where: { id: original.id } });
  expect(saved.nguoi_su_dung_id).toBeNull(); expect(saved.hinh_thuc_su_dung).toBe("DUNG_CHUNG"); expect(saved.vi_tri_id).toBe(original.vi_tri_id);
});
