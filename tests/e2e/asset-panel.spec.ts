import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
import { todayVietnam } from "../../src/lib/asset-depreciation";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable DB only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, viewer: Account, id: number, category: number, person: number, location: number;
const detail = (page: Page) => page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true });
const edit = (page: Page) => page.getByRole("form", { name: "Sửa thông tin tài sản", exact: true });
const link = () => `/assets?asset=${id}`;
const save = async (page: Page) => { await edit(page).getByRole("button", { name: "Lưu", exact: true }).click(); await expect(edit(page)).not.toBeVisible(); };
test.beforeAll(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Panel ${run}` } });
  for (const level of ["MANAGE", "VIEW"]) {
    const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: level, pham_vi: "ALL" } });
    const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: level, ten_vai_tro: level, danh_sach_quyen: { create: { permission_id: permission.id } } } });
    const account = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `panel-${run}-${level}`, ten_hien_thi: level, mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
    if (level === "MANAGE") manager = account; else viewer = account;
  }
  category = (await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: "PC", ten_loai: "Máy tính", khau_hao_mac_dinh_thang: 12 } })).id;
  person = (await db.nhan_su.create({ data: { company_id: company.id, ho_ten: "Phạm Thị Kim Loan", tinh_trang_lam_viec: "ACTIVE" } })).id;
  location = (await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: "Phòng thử", loai_vi_tri: "PHONG" } })).id;
  id = (await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category, ten_tai_san: "PC panel", so_serial: "SERIAL-KEEP", hang_model: "MODEL-KEEP", ghi_chu: "Ghi chú cần giữ" } })).id;
});
test.afterAll(async () => db.$disconnect());

test("click values edits within the panel; searchable person/location saves preserve dossier and URL", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto(link());
  await expect(detail(page).getByLabel("Mã tài sản tự sinh, không thể sửa")).toBeVisible();
  await expect(detail(page).getByRole("button", { name: "Sửa tài sản", exact: true })).toHaveCount(0);
  await detail(page).getByRole("button", { name: "Sửa người sử dụng", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Tìm người sử dụng", exact: true }).fill("pham loan");
  await page.getByRole("option", { name: /Phạm Thị Kim Loan/ }).click();
  await expect(edit(page).getByRole("combobox", { name: "Hình thức sử dụng", exact: true })).toContainText("Cá nhân");
  await save(page); await expect(detail(page).getByRole("button", { name: "Sửa người sử dụng", exact: true })).toContainText("Phạm Thị Kim Loan");
  await detail(page).getByRole("button", { name: "Sửa vị trí", exact: true }).click();
  await page.getByRole("combobox", { name: "Tìm vị trí", exact: true }).fill("phong thu");
  await page.getByRole("option", { name: "Phòng thử", exact: true }).click(); await save(page);
  const row = await db.tai_san.findUniqueOrThrow({ where: { id } });
  expect(row.nguoi_su_dung_id).toBe(person); expect(row.vi_tri_id).toBe(location);
  expect(row.so_serial).toBe("SERIAL-KEEP"); expect(row.hang_model).toBe("MODEL-KEEP"); expect(row.ghi_chu).toBe("Ghi chú cần giữ");
  await expect(page).toHaveURL(new RegExp(`asset=${id}$`));
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, doi_tuong_id: `tai_san:${id}` } })).toBe(2);
});

test("close, tabs and Back cannot discard a draft; failed save stays editable and Cancel restores value", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  await page.getByRole("button", { name: "Mở tài sản PC panel", exact: true }).click();
  await detail(page).getByRole("button", { name: "Sửa tên tài sản", exact: true }).click();
  await edit(page).getByLabel("Tên tài sản", { exact: true }).fill("Bản nháp giữ lại");
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(edit(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Bản nháp giữ lại");
  await expect(detail(page).getByRole("tab", { name: "Lịch sử", exact: true })).toBeDisabled();
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(new RegExp(`asset=${id}$`));
  await expect(edit(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Bản nháp giữ lại");
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort() : route.continue();
  await page.route("**/assets?asset=*", block);
  await edit(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(edit(page).getByRole("alert")).toContainText("Nội dung đang sửa vẫn được giữ");
  await page.unroute("**/assets?asset=*", block);
  await edit(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(detail(page).getByRole("heading", { name: "PC panel", exact: true })).toBeVisible();
  await expect(detail(page).getByRole("button", { name: "Sửa tên tài sản", exact: true })).toBeFocused();
});

test("optional finance validates, applies category months explicitly and renders remaining-value bar/history", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto(link());
  await expect(detail(page).getByRole("button", { name: "Sửa ngày mua", exact: true })).not.toBeVisible();
  await detail(page).locator("summary").filter({ hasText: "Mua sắm & khấu hao" }).click();
  await detail(page).getByRole("button", { name: "Sửa ngày mua", exact: true }).click();
  await expect(edit(page).getByLabel("Khấu hao (tháng)", { exact: true })).toHaveValue("");
  await edit(page).getByRole("button", { name: "Áp dụng mặc định của loại: 12 tháng", exact: true }).click();
  await edit(page).getByLabel("Ngày mua", { exact: true }).fill(todayVietnam());
  await edit(page).getByLabel("Giá mua (VND)", { exact: true }).fill("12000000");
  await edit(page).getByLabel("Hết hạn bảo hành", { exact: true }).fill("2020-01-01");
  await edit(page).getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(edit(page).getByText("Hạn bảo hành không được trước ngày mua", { exact: true })).toBeVisible();
  await edit(page).getByLabel("Hết hạn bảo hành", { exact: true }).fill(""); await save(page);
  await expect(detail(page).getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  await expect(detail(page).getByText(/Giá trị còn lại: 12.000.000/)).toBeVisible();
  await detail(page).getByRole("tab", { name: "Lịch sử", exact: true }).click();
  const history = page.getByRole("region", { name: "Lịch sử tài sản" });
  await history.locator("summary").first().click();
  await expect(history).toContainText("12.000.000 ₫");
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  await expect(page.getByRole("table").getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
  await page.screenshot({ animations: "disabled", path: "outputs/assets-panel/table-green.png" });
});

test("category presets are configurable and never retroactively change existing assets", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Loại tài sản", exact: true }).click();
  await page.getByRole("button", { name: "Sửa loại Máy tính", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Sửa loại tài sản", exact: true });
  await form.locator("summary").filter({ hasText: "Khấu hao mặc định" }).click();
  await form.getByLabel("Thời gian mặc định (tháng)", { exact: true }).fill("0");
  await form.locator("summary").filter({ hasText: "Khấu hao mặc định" }).click();
  await form.getByRole("button", { name: "Lưu loại tài sản", exact: true }).click();
  await expect(form.getByText("Tối thiểu 1 tháng", { exact: true })).toBeVisible();
  await form.getByRole("button", { name: "5 năm", exact: true }).click();
  await form.getByRole("button", { name: "Lưu loại tài sản", exact: true }).click();
  await expect(form).not.toBeVisible();
  expect((await db.loai_tai_san.findUniqueOrThrow({ where: { id: category } })).khau_hao_mac_dinh_thang).toBe(60);
  expect((await db.tai_san.findUniqueOrThrow({ where: { id } })).thoi_gian_khau_hao_thang).toBe(12);
  await page.goto(link()); await detail(page).locator("summary").filter({ hasText: "Mua sắm & khấu hao" }).click();
  await detail(page).getByRole("button", { name: "Sửa ngày mua", exact: true }).click();
  await expect(edit(page).getByLabel("Khấu hao (tháng)", { exact: true })).toHaveValue("12");
  await expect(edit(page).getByRole("button", { name: "Áp dụng mặc định của loại: 60 tháng", exact: true })).toBeVisible();
  await edit(page).getByLabel("Ngày mua", { exact: true }).fill("2020-01-01"); await save(page);
  await expect(detail(page).getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
  await expect(detail(page).getByText("Đã hết kỳ khấu hao", { exact: true })).toBeVisible();
});

test("VIEW is read-only; finance stays collapsed; mobile light/dark fit with inline editing", async ({ page, context }) => {
  await signAccount(context, viewer); await page.goto(link());
  await expect(detail(page).getByRole("button", { name: /^Sửa / })).toHaveCount(0);
  await expect(detail(page).getByRole("meter")).not.toBeVisible();
  await detail(page).locator("summary").filter({ hasText: "Mua sắm & khấu hao" }).click();
  await expect(detail(page).getByRole("meter")).toBeVisible();
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => localStorage.setItem("theme", theme), theme); await page.goto(link());
    await detail(page).locator("summary").filter({ hasText: "Mua sắm & khấu hao" }).click();
    await detail(page).getByRole("button", { name: "Sửa giá mua (vnd)", exact: true }).click();
    await edit(page).getByLabel("Giá mua (VND)", { exact: true }).fill("0");
    await edit(page).getByRole("button", { name: "Lưu", exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ animations: "disabled", path: `outputs/assets-panel/mobile-${theme}.png` });
    await edit(page).getByRole("button", { name: "Hủy", exact: true }).click();
  }
});
