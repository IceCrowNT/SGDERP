import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable restored DB only");
test.describe.configure({ mode: "serial", timeout: 90_000 });
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
let company: number, department: number, person: { id: number; ma_nhan_su: string }, seat: number, asset: number;
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const longLocation = "Vị trí làm việc có tên rất dài để kiểm tra xuống dòng trên điện thoại và phân biệt khu vực sử dụng";
const picker = (page: Page, label: string) => page.getByRole("combobox", { name: label, exact: true });
const search = (page: Page, label: string) => picker(page, `Tìm ${label.toLocaleLowerCase("vi")}`);

test.beforeAll(async () => {
  company = (await db.cong_ty.create({ data: { ten_cong_ty: `Search UI ${run}` } })).id;
  const permissions = await db.quyen.findMany({ where: { phan_he: { in: ["HR", "ASSETS", "LOCATIONS", "ACCOUNTS", "ROLES", "WORKFLOW"] }, hanh_dong: "MANAGE", pham_vi: "ALL" } });
  const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: "MANAGER", ten_vai_tro: "Người thử", danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  manager = await db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `search-ui-${run}`, ten_hien_thi: "Người thử", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  department = (await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "HCNS_SEARCH", ten_phong_ban: "Phòng Hành chính Tổng hợp" } })).id;
  await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "IT_SEARCH", ten_phong_ban: "Ban Công nghệ" } });
  for (let i = 0; i < 60; i++) {
    const p = await db.nhan_su.create({ data: { company_id: company, department_id: department, ho_ten: i < 2 ? "Đặng Thị Ánh" : `Nhân sự đối chiếu ${String(i).padStart(2, "0")}`, tinh_trang_lam_viec: "ACTIVE" } });
    if (i === 1) person = p;
  }
  const floor = await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: "Tầng 2", loai_vi_tri: "TANG" } });
  seat = (await db.vi_tri.create({ data: { company_id: company, parent_id: floor.id, ten_vi_tri: longLocation, loai_vi_tri: "CHO_NGOI" } })).id;
  const category = await db.loai_tai_san.create({ data: { company_id: company, ma_loai: "LEGACY", ten_loai: "Loại thiết bị cũ" } });
  asset = (await db.tai_san.create({ data: { company_id: company, loai_tai_san_id: category.id, ten_tai_san: "Thiết bị liên kết cũ" } })).id;
  await db.loai_tai_san.update({ where: { id: category.id }, data: { dang_su_dung: false } });
  await db.loai_tai_san.create({ data: { company_id: company, ma_loai: "LAPTOP", ten_loai: "Máy tính xách tay" } });
});
// The runner drops this disposable DB; asset history/rows are never hard-deleted.
test.afterAll(async () => db.$disconnect());

test("search accepts accents and reordered words; Enter selects, Escape keeps form/value, unmatched text cannot become a value", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/employees");
  await page.getByRole("button", { name: "Thêm nhân sự", exact: true }).click();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nội dung cần giữ");
  const form = page.getByRole("dialog", { name: "Thêm hồ sơ nhân sự", exact: true });
  const trigger = picker(page, "Phòng ban");
  await trigger.focus(); await trigger.press("ArrowDown");
  await expect(search(page, "Phòng ban")).toBeFocused();
  await search(page, "Phòng ban").fill("TONG hanh");
  await expect(page.getByRole("option")).toHaveCount(1);
  await search(page, "Phòng ban").press("Enter");
  await expect(trigger).toContainText("Phòng Hành chính Tổng hợp");
  await expect(trigger).toBeFocused(); await expect(form).toBeVisible();
  await trigger.click(); await search(page, "Phòng ban").fill("Đơn vị không tồn tại");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.getByText("Không tìm thấy kết quả phù hợp.", { exact: true })).toBeVisible();
  await search(page, "Phòng ban").press("Enter");
  await expect(search(page, "Phòng ban")).toBeVisible();
  await search(page, "Phòng ban").press("Escape");
  await expect(trigger).toContainText("Phòng Hành chính Tổng hợp");
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue("Nội dung cần giữ");
  await picker(page, "Vị trí làm việc").click(); await search(page, "Vị trí làm việc").fill("tang 2");
  await expect(page.getByRole("option")).toHaveCount(1);
  await search(page, "Vị trí làm việc").press("Enter");
  await expect(picker(page, "Vị trí làm việc")).toContainText(longLocation);
  await picker(page, "Vị trí làm việc").click();
  await page.getByRole("option", { name: "Chưa xác định vị trí", exact: true }).click();
  await expect(picker(page, "Vị trí làm việc")).toContainText("Chưa xác định vị trí");
  expect(await db.nhan_su.count({ where: { company_id: company } })).toBe(60);
});

test("asset picker preserves disabled categories, disambiguates people by code and saves IDs on mobile in light/dark", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Mở tài sản Thiết bị liên kết cũ", exact: true }).click();
  await page.getByRole("button", { name: "Sửa tài sản", exact: true }).click();
  await picker(page, "Loại tài sản").click();
  await expect(page.getByRole("option", { name: "Loại thiết bị cũ", exact: true })).toBeDisabled();
  await search(page, "Loại tài sản").press("Escape");
  await expect(picker(page, "Loại tài sản")).toContainText("Loại thiết bị cũ");
  await picker(page, "Hình thức sử dụng").click(); await page.getByRole("option", { name: "Cá nhân", exact: true }).click();
  await picker(page, "Người sử dụng").click(); await search(page, "Người sử dụng").fill("anh dang");
  await expect(page.getByRole("option")).toHaveCount(2);
  await search(page, "Người sử dụng").fill(person.ma_nhan_su);
  await expect(page.getByRole("option")).toHaveCount(1);
  await search(page, "Người sử dụng").press("Enter");
  await expect(picker(page, "Người sử dụng")).toContainText(person.ma_nhan_su);
  await picker(page, "Phòng quản lý").click(); await search(page, "Phòng quản lý").fill("HCNS_SEARCH");
  await search(page, "Phòng quản lý").press("Enter");
  await page.setViewportSize({ width: 390, height: 844 });
  await picker(page, "Vị trí").click(); await search(page, "Vị trí").fill("tang 2");
  const panel = page.locator('[data-slot="popover-content"]');
  await expect.poll(async () => { const b = await panel.boundingBox(); return Boolean(b && b.x >= 0 && b.x + b.width <= 390 && b.height > 100); }).toBe(true);
  await page.screenshot({ animations: "disabled", path: "outputs/searchable-select/mobile-light.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ animations: "disabled", path: "outputs/searchable-select/mobile-dark.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("option", { name: new RegExp(longLocation) }).click();
  await page.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toBeVisible();
  const saved = await db.tai_san.findUniqueOrThrow({ where: { id: asset } });
  expect(saved.nguoi_su_dung_id).toBe(person.id); expect(saved.phong_quan_ly_id).toBe(department); expect(saved.vi_tri_id).toBe(seat);
});

test("department heads, account owners, parent locations and workflow assignees use searchable catalogs", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/departments");
  await page.getByRole("button", { name: "Thêm phòng ban", exact: true }).click();
  await picker(page, "Người phụ trách phòng ban").click(); await search(page, "Người phụ trách phòng ban").fill("dang hanh chinh");
  await expect(page.getByRole("option")).toHaveCount(2);
  await search(page, "Người phụ trách phòng ban").fill(person.ma_nhan_su);
  await search(page, "Người phụ trách phòng ban").press("Enter");
  await expect(picker(page, "Người phụ trách phòng ban")).toContainText(person.ma_nhan_su);
  await picker(page, "Phòng ban cấp trên").click(); await search(page, "Phòng ban cấp trên").fill("cong nghe");
  await search(page, "Phòng ban cấp trên").press("Enter");
  await expect(picker(page, "Phòng ban cấp trên")).toContainText("Ban Công nghệ");
  await page.goto("/accounts"); await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await picker(page, "Nhân sự sở hữu").click(); await search(page, "Nhân sự sở hữu").fill(person.ma_nhan_su);
  await search(page, "Nhân sự sở hữu").press("Enter");
  await expect(picker(page, "Nhân sự sở hữu")).toContainText(person.ma_nhan_su);
  await page.goto("/locations"); await page.getByRole("button", { name: "Thêm vị trí", exact: true }).click();
  await picker(page, "Vị trí cấp trên").click(); await search(page, "Vị trí cấp trên").fill("tang 2");
  await expect(page.getByRole("option")).toHaveCount(2);
  await search(page, "Vị trí cấp trên").press("Escape");
  await page.goto("/workflows"); await page.getByRole("button", { name: "Tạo mẫu", exact: true }).click();
  await picker(page, "Cách chọn người bước 1").click(); await page.getByRole("option", { name: "Nhân sự cụ thể", exact: true }).click();
  await picker(page, "Người xử lý bước 1").click(); await search(page, "Người xử lý bước 1").fill(person.ma_nhan_su);
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.screenshot({ animations: "disabled", path: "outputs/searchable-select/desktop.png" });
  await search(page, "Người xử lý bước 1").press("Enter");
  await expect(picker(page, "Người xử lý bước 1")).toContainText(person.ma_nhan_su);
});
