import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated asset DB only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let company: number, foreign: number, manager: Account, viewer: Account, outsider: Account, viewerRole: number;
let person: { id: number; ho_ten: string; ma_nhan_su: string }, department: number, one: number, two: number, category: number, asset: number, foreignAsset: number;
let saveRequest: Request;
const name = `Laptop thử ${run}`;
const action = (r: Request) => r.method() === "POST" && Boolean(r.headers()["next-action"]);
const dialog = (page: Page) => page.getByRole("dialog", { name: /^(Thêm|Sửa) tài sản$/ });
async function select(page: Page, label: string, option: string | RegExp) {
  await dialog(page).getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
}
async function replay(page: Page, request: Request, payload: unknown) {
  return (await page.request.post("/assets", { headers: { "Next-Action": request.headers()["next-action"], "Content-Type": request.headers()["content-type"] }, data: JSON.stringify([payload]) })).text();
}
async function open(page: Page) {
  if (await page.getByRole("button", { name: "Xem tất cả", exact: true }).isVisible()) await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  await page.getByRole("button", { name: `Mở tài sản ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true }).getByRole("heading", { name, exact: true })).toBeVisible();
}
test.beforeAll(async () => {
  company = (await db.cong_ty.create({ data: { ten_cong_ty: `Assets UI ${run}` } })).id;
  foreign = (await db.cong_ty.create({ data: { ten_cong_ty: `Assets private ${run}` } })).id;
  for (const [label, level] of [["manager", "MANAGE"], ["viewer", "VIEW"], ["outsider", "NONE"]] as const) {
    const permission = level === "NONE" ? null : await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: level, pham_vi: "ALL" } });
    const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: label.toUpperCase(), ten_vai_tro: label, danh_sach_quyen: { create: permission ? [{ permission_id: permission.id }] : [] } } });
    const account = await db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `asset-ui-${label}-${run}`, ten_hien_thi: `Người thử ${label}`, mat_khau_bam: "disabled-for-login", danh_sach_vai_tro: { create: { role_id: role.id } } } });
    if (label === "manager") manager = account;
    if (label === "viewer") { viewer = account; viewerRole = role.id; }
    if (label === "outsider") outsider = account;
  }
  person = await db.nhan_su.create({ data: { company_id: company, ho_ten: `Người dùng ${run}`, tinh_trang_lam_viec: "ACTIVE", ghi_chu: "PRIVATE_HR_DATA", so_dien_thoai: "PRIVATE_HR_PHONE" } });
  department = (await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "IT", ten_phong_ban: "Phòng IT thử" } })).id;
  one = (await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: "Bàn thử A", loai_vi_tri: "DIEM_DAT_THIET_BI" } })).id;
  two = (await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: "Bàn thử B", loai_vi_tri: "DIEM_DAT_THIET_BI" } })).id;
  const c = await db.loai_tai_san.create({ data: { company_id: foreign, ma_loai: "PRIVATE", ten_loai: "PRIVATE_CATEGORY" } });
  foreignAsset = (await db.tai_san.create({ data: { company_id: foreign, loai_tai_san_id: c.id, ten_tai_san: "PRIVATE_ASSET" } })).id;
});
// Asset rows are deliberately not deleted; the owning disposable DB is dropped by the runner.
test.afterAll(async () => { await db.$disconnect(); });

test("empty state, required fields, category creation and personal assignment work without HR rights", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await expect(page.getByRole("link", { name: "Quản lý tài sản", exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có hồ sơ tài sản", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thêm loại tài sản", exact: true }).click();
  await page.getByRole("button", { name: "Lưu loại tài sản", exact: true }).click();
  await expect(page.getByText("Nhập tên", { exact: true })).toBeVisible();
  await page.getByLabel("Mã loại", { exact: true }).fill("LAPTOP");
  await page.getByLabel("Tên loại", { exact: true }).fill("Laptop thử");
  await page.getByRole("button", { name: "Lưu loại tài sản", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thêm tài sản", exact: true })).toBeEnabled();
  category = (await db.loai_tai_san.findUniqueOrThrow({ where: { company_id_ma_loai: { company_id: company, ma_loai: "LAPTOP" } } })).id;
  await page.getByRole("button", { name: "Thêm tài sản", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(dialog(page).getByText("Nhập tên", { exact: true })).toBeVisible();
  await page.getByLabel("Tên tài sản", { exact: true }).fill(name);
  await select(page, "Loại tài sản", "Laptop thử");
  await select(page, "Hình thức sử dụng", "Cá nhân");
  await dialog(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(dialog(page).getByText("Chọn người sử dụng", { exact: true }).last()).toBeVisible();
  await select(page, "Người sử dụng", new RegExp(person.ho_ten));
  await select(page, "Phòng quản lý", "Phòng IT thử");
  await select(page, "Vị trí", "Bàn thử A");
  await dialog(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await page.getByLabel("Serial / Service tag", { exact: true }).fill("SERIAL-TEST");
  const request = page.waitForRequest(r => action(r) && (r.postData() ?? "").includes('"categoryId"'));
  await dialog(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click(); saveRequest = await request;
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  asset = (await db.tai_san.findFirstOrThrow({ where: { company_id: company, ten_tai_san: name } })).id;
  const row = await db.tai_san.findUniqueOrThrow({ where: { id: asset } });
  expect(row.nguoi_su_dung_id).toBe(person.id); expect(row.vi_tri_id).toBe(one); expect(row.phong_quan_ly_id).toBe(department);
  await page.getByRole("tab", { name: "Lịch sử", exact: true }).click();
  await expect(page.getByRole("region", { name: "Lịch sử tài sản" })).toContainText("Tạo hồ sơ");
  expect(await page.content()).not.toContain("PRIVATE_HR_DATA");
  await page.screenshot({ path: "outputs/assets-ui/detail-desktop.png" });
});

test("edit clears a personal assignment, changes location/status and preserves readable history", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets"); await open(page);
  await page.getByRole("button", { name: "Sửa tài sản", exact: true }).click();
  await select(page, "Hình thức sử dụng", "Dùng chung");
  await expect(dialog(page).getByRole("combobox", { name: "Người sử dụng", exact: true })).toHaveCount(0);
  await select(page, "Tình trạng", "Hỏng"); await select(page, "Vị trí", "Bàn thử B");
  await dialog(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await page.getByLabel("Ghi chú", { exact: true }).fill("Kiểm tra bộ nguồn");
  await page.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toBeVisible();
  const row = await db.tai_san.findUniqueOrThrow({ where: { id: asset } });
  expect(row.nguoi_su_dung_id).toBeNull(); expect(row.vi_tri_id).toBe(two); expect(row.tinh_trang).toBe("HONG");
  await page.getByRole("tab", { name: "Lịch sử", exact: true }).click();
  const history = page.getByRole("region", { name: "Lịch sử tài sản" });
  await history.locator("summary").filter({ hasText: "Cập nhật hồ sơ" }).first().click();
  await expect(history).toContainText("Cập nhật hồ sơ"); await expect(history).toContainText(person.ho_ten);
  await expect(history).not.toContainText("nguoi_su_dung_id");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Tình trạng", exact: true }).click(); await page.getByRole("option", { name: "Hỏng", exact: true }).click();
  await expect(page.getByRole("button", { name: `Mở tài sản ${name}`, exact: true })).toBeVisible();
  await open(page); await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Tình trạng", exact: true })).toContainText("Hỏng");
});

test("VIEW/none, direct action payloads, tenant bounds and revocation are enforced", async ({ page, context }) => {
  const payload = JSON.parse(saveRequest.postData()!)[0];
  await signAccount(context, viewer); await page.goto("/assets");
  await expect(page.getByRole("button", { name: "Thêm tài sản", exact: true })).toHaveCount(0);
  await open(page); await expect(page.getByRole("button", { name: "Sửa tài sản", exact: true })).toHaveCount(0);
  expect(await replay(page, saveRequest, payload)).toContain('"success":false');
  await signAccount(context, manager); await page.goto("/assets");
  expect(await replay(page, saveRequest, { ...payload, companyId: foreign })).toContain('"success":false');
  const remote = await db.tai_san.findUniqueOrThrow({ where: { id: foreignAsset } });
  expect(await replay(page, saveRequest, { ...payload, id: remote.id, version: remote.updated_at.toISOString() })).toContain('"success":false');
  expect(await page.content()).not.toContain("PRIVATE_ASSET"); expect(await page.content()).not.toContain("PRIVATE_CATEGORY");
  await signAccount(context, outsider); await page.goto("/assets");
  await expect(page.getByText("Không thể truy cập tài sản", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quản lý tài sản", exact: true })).toHaveCount(0);
  await db.vai_tro_quyen.deleteMany({ where: { role_id: viewerRole } });
  await signAccount(context, viewer); await page.goto("/assets");
  await expect(page.getByText("Không thể truy cập tài sản", { exact: true })).toBeVisible();
});

test("stale edits keep input and do not overwrite; inactive links remain editable", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets"); await open(page);
  await page.getByRole("button", { name: "Sửa tài sản", exact: true }).click();
  await dialog(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await page.getByLabel("Ghi chú", { exact: true }).fill("Nội dung chưa lưu");
  await db.tai_san.update({ where: { id: asset }, data: { ghi_chu: "Người khác đã cập nhật" } });
  await page.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("Hồ sơ đã thay đổi");
  await expect(page.getByLabel("Ghi chú", { exact: true })).toHaveValue("Nội dung chưa lưu");
  expect((await db.tai_san.findUniqueOrThrow({ where: { id: asset } })).ghi_chu).toBe("Người khác đã cập nhật");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await db.tai_san.update({ where: { id: asset }, data: { hinh_thuc_su_dung: "CA_NHAN", nguoi_su_dung_id: person.id } });
  await db.nhan_su.update({ where: { id: person.id }, data: { tinh_trang_lam_viec: "LEFT" } });
  await db.loai_tai_san.update({ where: { id: category }, data: { dang_su_dung: false } });
  await page.reload(); await open(page);
  await expect(page.getByText(/Cần kiểm tra và xử lý bàn giao thiết bị/)).toBeVisible();
  await page.getByRole("button", { name: "Sửa tài sản", exact: true }).click();
  await dialog(page).locator("summary").filter({ hasText: "Thông tin bổ sung" }).click();
  await page.getByLabel("Ghi chú", { exact: true }).fill("Chờ bàn giao");
  await page.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toBeVisible();
  const saved = await db.tai_san.findUniqueOrThrow({ where: { id: asset } });
  expect(saved.nguoi_su_dung_id).toBe(person.id); expect(saved.ghi_chu).toBe("Chờ bàn giao");
  await db.loai_tai_san.update({ where: { id: category }, data: { dang_su_dung: true } });
});

test("search pagination and mobile light/dark layouts are usable", async ({ page, context }) => {
  for (let i = 0; i < 23; i++) await db.tai_san.create({ data: { company_id: company, loai_tai_san_id: category, ten_tai_san: `Thiết bị phân trang ${run} ${i}`, tinh_trang: i < 3 ? "NGUNG_SU_DUNG" : "BINH_THUONG" } });
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("textbox", { name: "Tìm tài sản", exact: true }).fill(`Thiết bị phân trang ${run}`);
  await page.getByRole("button", { name: "Tìm kiếm tài sản", exact: true }).click();
  await expect(page.getByText("23 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Danh sách tài sản", exact: true }).locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByRole("table", { name: "Danh sách tài sản", exact: true }).locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.getByText("24 hồ sơ · Trang 1/2", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Danh sách tài sản", exact: true }).locator("tbody tr")).toHaveCount(20);
  await page.screenshot({ path: "outputs/assets-ui/list-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "outputs/assets-ui/list-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Thêm tài sản", exact: true }).click();
  await expect.poll(async () => { const b = await dialog(page).boundingBox(); return Boolean(b && b.x >= 0 && b.x + b.width <= 390); }).toBe(true);
  await select(page, "Hình thức sử dụng", "Cá nhân");
  await expect(dialog(page).getByRole("combobox", { name: "Người sử dụng", exact: true })).toBeVisible();
  await page.screenshot({ path: "outputs/assets-ui/form-mobile.png" });
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.evaluate(() => localStorage.setItem("theme", "dark")); await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: "outputs/assets-ui/list-mobile-dark.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("network failures show retry actions and keep entered form values", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.setViewportSize({ width: 390, height: 844 });
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort("failed") : route.continue();
  await page.route("**/assets", block);
  await page.getByRole("button", { name: "Thêm tài sản", exact: true }).click();
  await page.getByLabel("Tên tài sản", { exact: true }).fill("Giữ nội dung khi mất mạng");
  await expect(dialog(page).getByRole("alert")).toContainText("Không tải được danh mục");
  await expect(page.getByRole("button", { name: "Lưu tài sản", exact: true })).toBeDisabled();
  await page.unroute("**/assets", block);
  await page.getByRole("button", { name: "Tải lại danh mục", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lưu tài sản", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Tên tài sản", { exact: true })).toHaveValue("Giữ nội dung khi mất mạng");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.route("**/assets", block);
  await page.getByRole("button", { name: "Tìm kiếm tài sản", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được danh sách" })).toBeVisible();
  await page.unroute("**/assets", block);
  await page.getByRole("button", { name: "Tải lại danh sách", exact: true }).click();
  await expect(page.getByRole("table", { name: "Danh sách tài sản", exact: true }).locator("tbody tr")).toHaveCount(20);
});
