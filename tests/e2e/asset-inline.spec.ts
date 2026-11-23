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
  await page.getByRole("combobox", { name: "Chọn loại tài sản", exact: true }).click();
  await page.getByRole("option", { name: "Máy tính bàn", exact: true }).click();
  await expect(table(page).locator("tbody tr")).toHaveCount(20);
}
const editor = (page: Page) => page.locator("tr[data-inline-editor]");

test("selecting a location saves immediately, preserves hidden fields and creates one audit", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa vị trí của PC-24", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Tìm vị trí", exact: true })).toBeFocused();
  await page.getByRole("option", { name: "Bàn số 07", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  const cell = table(page).getByRole("button", { name: "Sửa vị trí của PC-24", exact: true });
  await expect(cell).toHaveText("Bàn số 07"); await expect(cell).toBeFocused();
  const row = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC-24" } });
  expect(row.vi_tri_id).not.toBeNull(); expect(row.ghi_chu).toBe("Ghi chú cần giữ"); expect(row.hang_model).toBe("Model cần giữ");
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, doi_tuong_id: `tai_san:${row.id}` } })).toBe(1);
});

test("personal usage waits for a person, then saves both fields together", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa người sử dụng của PC-23", exact: true }).click();
  await page.getByRole("option", { name: "Cá nhân", exact: true }).click();
  await expect(editor(page).getByText("Chọn người sử dụng", { exact: true }).last()).toBeVisible();
  const before = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC-23" } });
  expect(before.hinh_thuc_su_dung).toBe("CHUA_XAC_DINH");
  await editor(page).getByRole("combobox", { name: "Người sử dụng", exact: true }).click();
  await page.getByRole("combobox", { name: "Tìm người sử dụng", exact: true }).fill("nguyen an");
  await page.getByRole("option", { name: /Nguyễn An/ }).click();
  await expect(editor(page)).toHaveCount(0);
  const after = await db.tai_san.findUniqueOrThrow({ where: { id: before.id } });
  expect(after.hinh_thuc_su_dung).toBe("CA_NHAN"); expect(after.nguoi_su_dung_id).not.toBeNull();
  expect(await db.nhat_ky_hoat_dong.count({ where: { doi_tuong_id: `tai_san:${before.id}` } })).toBe(1);
});

test("text saves on blur and Enter; Escape discards only unsaved text; unchanged input creates no audit", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-22", exact: true }).click();
  const name = () => editor(page).getByLabel("Tên tài sản", { exact: true });
  await name().fill("Bản nháp bỏ"); await name().press("Escape");
  await expect(editor(page)).toHaveCount(0);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-22", exact: true }).click();
  await name().fill("PC đổi bằng Enter"); await name().press("Enter");
  await expect(editor(page)).toHaveCount(0);
  await table(page).getByRole("button", { name: "Sửa nhanh PC đổi bằng Enter", exact: true }).click();
  await name().fill("PC đổi bằng blur"); await page.getByRole("columnheader", { name: "Tài sản", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await table(page).getByRole("button", { name: "Sửa nhanh PC đổi bằng blur", exact: true }).click();
  await name().press("Tab");
  await editor(page).getByRole("button", { name: "Đóng", exact: true }).click();
  const saved = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC đổi bằng blur" } });
  expect(await db.nhat_ky_hoat_dong.count({ where: { doi_tuong_id: `tai_san:${saved.id}` } })).toBe(2);
});

test("network failure retries, stale versions never overwrite and drafts remain editable", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-21", exact: true }).click();
  await expect(editor(page).getByRole("combobox", { name: "Vị trí", exact: true })).toBeEnabled();
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort() : route.continue();
  await page.route("**/assets**", block);
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("PC sau lỗi mạng");
  await editor(page).getByLabel("Tên tài sản", { exact: true }).press("Enter");
  await expect(table(page).getByRole("alert")).toContainText("Nội dung đang sửa vẫn được giữ");
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("PC sau lỗi mạng");
  await page.unroute("**/assets**", block); await page.getByRole("button", { name: "Thử lưu lại", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await table(page).getByRole("button", { name: "Sửa nhanh PC sau lỗi mạng", exact: true }).click();
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("Không được ghi đè");
  const before = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC sau lỗi mạng" } });
  await db.tai_san.update({ where: { id: before.id }, data: { ghi_chu: "Phiên khác", updated_at: new Date(before.updated_at.getTime() + 1000) } });
  await editor(page).getByLabel("Tên tài sản", { exact: true }).press("Enter");
  await expect(table(page).getByRole("alert")).toContainText("Hồ sơ đã thay đổi");
  await editor(page).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  expect((await db.tai_san.findUniqueOrThrow({ where: { id: before.id } })).ghi_chu).toBe("Phiên khác");
});

test("mobile location retry works and VIEW cannot edit", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await openGroup(page);
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort() : route.continue();
  await page.route("**/assets**", block);
  await table(page).getByRole("button", { name: "Sửa vị trí của PC-20", exact: true }).click();
  await expect(table(page).getByRole("alert")).toContainText("Không tải được danh mục");
  await page.unroute("**/assets**", block); await page.getByRole("button", { name: "Tải lại danh mục", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Tìm vị trí", exact: true })).toBeFocused();
  await page.getByRole("option", { name: "Bàn số 07", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/assets-autosave/inline-mobile.png" });
  const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: "VIEW", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: manager.company_id, ma_vai_tro: "VIEWER", ten_vai_tro: "Xem", danh_sach_quyen: { create: { permission_id: permission.id } } } });
  const viewer = await db.tai_khoan.create({ data: { company_id: manager.company_id, ten_dang_nhap: `inline-view-${run}`, ten_hien_thi: "Viewer", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  await signAccount(context, viewer); await openGroup(page);
  await expect(table(page).getByRole("button", { name: /^Sửa / })).toHaveCount(0);
});

test("changing usage automatically removes a person-group row and updates counts", async ({ page, context }) => {
  const original = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC-0" } });
  const count = await db.tai_san.count({ where: { company_id: manager.company_id, nguoi_su_dung_id: original.nguoi_su_dung_id } });
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("combobox", { name: "Cách xem tài sản", exact: true }).click();
  await page.getByRole("option", { name: "Theo người", exact: true }).click();
  await page.getByRole("button", { name: "Mở nhóm Nguyễn An", exact: true }).click();
  await table(page).getByRole("button", { name: "Sửa nhanh PC-0", exact: true }).click();
  await editor(page).getByRole("combobox", { name: "Hình thức sử dụng", exact: true }).click();
  await page.getByRole("option", { name: "Dùng chung", exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(table(page).locator("tbody tr")).toHaveCount(count - 1);
  await back(page); await expect(page.getByRole("button", { name: "Mở nhóm Nguyễn An", exact: true })).toContainText(String(count - 1));
  const saved = await db.tai_san.findUniqueOrThrow({ where: { id: original.id } });
  expect(saved.nguoi_su_dung_id).toBeNull(); expect(saved.vi_tri_id).toBe(original.vi_tri_id);
});

test("a pending autosave locks input and repeated submit does not duplicate the mutation", async ({ page, context }) => {
  await signAccount(context, manager); await openGroup(page);
  await table(page).getByRole("button", { name: "Sửa nhanh PC-19", exact: true }).click();
  await expect(editor(page).getByRole("combobox", { name: "Vị trí", exact: true })).toBeEnabled();
  let release!: () => void, writes = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets**", async route => {
    if (route.request().method() === "POST") { writes++; await gate; }
    await route.continue();
  });
  const name = editor(page).getByLabel("Tên tài sản", { exact: true });
  try {
    await name.fill("PC lưu một lần"); await name.press("Enter");
    await expect(table(page).getByRole("status")).toHaveText("Đang lưu…");
    await expect(name).toBeDisabled();
    await name.dispatchEvent("keydown", { key: "Enter", bubbles: true });
  } finally { release(); }
  await expect(editor(page)).toHaveCount(0);
  expect(writes).toBeGreaterThanOrEqual(1); // Catalog refresh also uses POST Server Actions.
  const row = await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ten_tai_san: "PC lưu một lần" } });
  expect(await db.nhat_ky_hoat_dong.count({ where: { doi_tuong_id: `tai_san:${row.id}` } })).toBe(1);
});
