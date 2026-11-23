import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
test.describe.configure({ mode: "serial" });
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number }, viewer: typeof manager, none: typeof manager;
let company: number, role: number, grant: number, place: number, itemId: number;
const panel = (p: Page) => p.getByRole("dialog", { name: "Chi tiết mặt hàng", exact: true });
const table = (p: Page) => p.getByRole("table", { name: "Danh sách mặt hàng", exact: true });
async function pick(p: Page, label: string, option: string) { await p.getByRole("combobox", { name: label, exact: true }).click(); await p.getByRole("option", { name: option, exact: false }).click(); }
async function openItem(p: Page) { await p.goto(`/inventory?kind=accessory&item=${itemId}`); await expect(panel(p).getByRole("heading", { name: "Chuột không dây" })).toBeVisible(); }
async function stock(quantity: number) { const result = await db.$queryRaw<{ so_luong: bigint }[]>`SELECT sum(so_luong)::bigint so_luong FROM ton_vat_tu(${itemId}::int)`; expect(Number(result[0]?.so_luong ?? 0)).toBe(quantity); }
test.beforeAll(async () => {
  if (!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw Error("Isolated test DB only");
  const run = randomUUID().slice(0, 8); company = (await db.cong_ty.create({ data: { ten_cong_ty: `Inventory E2E ${run}` } })).id;
  const perms = await db.quyen.findMany({ where: { OR: [{ phan_he: "INVENTORY" }, { phan_he: "ASSETS", hanh_dong: "MANAGE" }] } });
  grant = perms.find(p => p.phan_he === "INVENTORY" && p.hanh_dong === "MANAGE")!.id;
  for (const name of ["manager", "viewer", "none"]) {
    const r = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: name.toUpperCase(), ten_vai_tro: name, danh_sach_quyen: { create: perms.filter(p => name === "manager" ? p.hanh_dong === "MANAGE" : name === "viewer" ? p.phan_he === "INVENTORY" && p.hanh_dong === "VIEW" : false).map(p => ({ permission_id: p.id })) } } });
    const a = await db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `inventory-${run}-${name}`, ten_hien_thi: name, mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: r.id } } } });
    if (name === "manager") { manager = a; role = r.id; } else if (name === "viewer") viewer = a; else none = a;
  }
  place = (await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: "Tủ vật tư HCNS", loai_vi_tri: "KHU_VUC" } })).id;
  await db.nhan_su.create({ data: { company_id: company, ho_ten: "Nguyễn An", tinh_trang_lam_viec: "ACTIVE" } });
  await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "HCNS", ten_phong_ban: "Phòng HCNS" } });
});
test.afterAll(async () => db.$disconnect());

test("three sections, create category/item, receive 20 and issue 2 to employee", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/asset-management");
  const tabs = page.getByRole("navigation", { name: "Hạng mục quản lý" }); await expect(tabs.getByRole("link")).toHaveCount(3);
  await tabs.getByRole("link", { name: "Phụ kiện", exact: true }).click();
  await page.getByRole("button", { name: "Thêm loại mặt hàng", exact: true }).click();
  const category = page.getByRole("dialog", { name: "Thêm loại mặt hàng", exact: true });
  await category.getByLabel("Mã loại", { exact: true }).fill("CHUOT"); await category.getByLabel("Tên loại", { exact: true }).fill("Chuột máy tính"); await category.getByRole("button", { name: "Lưu loại", exact: true }).click(); await expect(category).toBeHidden();
  await page.getByRole("button", { name: "Thêm mặt hàng", exact: true }).click();
  const item = page.getByRole("dialog", { name: "Thêm mặt hàng", exact: true }); await item.getByLabel("Tên mặt hàng", { exact: true }).fill("Chuột không dây"); await pick(page, "Loại mặt hàng", "Chuột máy tính"); await item.getByLabel("Đơn vị tính", { exact: true }).fill("cái"); await item.getByLabel("Mức tồn tối thiểu").fill("3"); await pick(page, "Phòng quản lý", "Phòng HCNS"); await item.getByRole("button", { name: "Lưu mặt hàng" }).click(); await expect(item).toBeHidden();
  await expect(panel(page).getByText(/Chưa ghi nhận tồn/)).toBeVisible(); itemId = (await db.mat_hang_vat_tu.findFirstOrThrow({ where: { company_id: company, ten_mat_hang: "Chuột không dây" } })).id;
  await panel(page).getByRole("button", { name: "Nhập hàng", exact: true }).click();
  const receipt = page.getByRole("dialog", { name: "Nhập hàng", exact: true }); await pick(page, "Nơi nhập", "Tủ vật tư HCNS"); await receipt.getByLabel("Số lượng", { exact: true }).fill("20"); await expect(receipt.getByLabel("Số lượng dự kiến")).toContainText("0 → 20"); await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt).toBeHidden(); await stock(20);
  await expect(panel(page).getByText("20 cái", { exact: true })).toBeVisible();
  await panel(page).getByRole("button", { name: "Cấp phát", exact: true }).click(); const issue = page.getByRole("dialog", { name: "Cấp phát", exact: true }); await pick(page, "Nơi xuất", "Tủ vật tư HCNS"); await pick(page, "Người nhận", "Nguyễn An"); await issue.getByLabel("Số lượng", { exact: true }).fill("2"); await issue.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(issue).toBeHidden(); await stock(18);
  await panel(page).getByRole("tab", { name: "Đang cấp", exact: true }).click(); await expect(panel(page).getByText("Còn 2 cái", { exact: true })).toBeVisible();
});

test("partial return and writeoff update outstanding allocation without full edit forms", async ({ page, context }) => {
  await signAccount(context, manager); await openItem(page); await panel(page).getByRole("tab", { name: "Đang cấp", exact: true }).click(); await panel(page).getByRole("button", { name: "Thu hồi", exact: true }).click();
  const ret = page.getByRole("dialog", { name: "Thu hồi", exact: true }); await pick(page, "Nơi nhập", "Tủ vật tư HCNS"); await ret.getByLabel("Số lượng", { exact: true }).fill("1"); await ret.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(ret).toBeHidden(); await expect(panel(page).getByText("Còn 1 cái", { exact: true })).toBeVisible(); await stock(19);
  await panel(page).getByRole("button", { name: "Ghi giảm", exact: true }).click(); const loss = page.getByRole("dialog", { name: "Ghi giảm đang cấp", exact: true }); await loss.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(loss.getByText("Nhập lý do", { exact: true })).toBeVisible(); await loss.getByLabel("Lý do", { exact: true }).fill("Hỏng, không thể sử dụng"); await loss.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(loss).toBeHidden(); await expect(panel(page).getByText("Không có phụ kiện đang cấp.")).toBeVisible(); await stock(19);
});

test("network failure keeps draft; retry records exactly once; stale balances require review", async ({ page, context }) => {
  await signAccount(context, manager); await openItem(page); await panel(page).getByRole("button", { name: "Nhập hàng", exact: true }).click();
  const receipt = page.getByRole("dialog", { name: "Nhập hàng", exact: true }); await pick(page, "Nơi nhập", "Tủ vật tư HCNS"); await receipt.getByLabel("Số lượng", { exact: true }).fill("3");
  const block = async (route: import("@playwright/test").Route) => route.request().method() === "POST" ? route.abort() : route.continue(); await page.route("**/inventory**", block);
  await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt.getByRole("alert")).toContainText("Chưa nhận được kết quả"); await expect(receipt.getByLabel("Số lượng", { exact: true })).toHaveValue("3"); await page.unroute("**/inventory**", block);
  await db.giao_dich_vat_tu.create({ data: { company_id: company, mat_hang_vat_tu_id: itemId, loai_giao_dich: "NHAP", so_luong: 1, vi_tri_nhap_id: place, request_id: randomUUID(), account_id: manager.id } });
  await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt.getByRole("alert")).toContainText("Số dư hoặc mặt hàng đã thay đổi");
  await receipt.getByRole("button", { name: "Cập nhật số dư", exact: true }).click(); await expect(receipt.getByLabel("Số lượng dự kiến")).toContainText("20 → 23"); await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt).toBeHidden(); await stock(23);
});

test("search without accents, keyboard picker, metadata version protection and history reversal", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/inventory?kind=accessory"); await page.getByRole("textbox", { name: "Tìm mặt hàng" }).fill("chuot khong"); await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click(); await expect(table(page).locator("tbody tr")).toHaveCount(1); await table(page).getByRole("button", { name: "Mở mặt hàng Chuột không dây" }).click();
  await panel(page).getByRole("button", { name: "Sửa thông tin", exact: true }).click(); const edit = page.getByRole("dialog", { name: "Sửa mặt hàng", exact: true }); await expect(edit.getByLabel("Đơn vị tính", { exact: true })).toBeEditable(); await edit.getByLabel("Ghi chú", { exact: true }).fill("Bản nháp giữ khi lỗi");
  await db.mat_hang_vat_tu.update({ where: { id: itemId }, data: { ghi_chu: "Thay đổi khác" } }); await edit.getByRole("button", { name: "Lưu mặt hàng" }).click(); await expect(edit.getByRole("alert")).toContainText("Thông tin đã thay đổi"); await expect(edit.getByLabel("Ghi chú", { exact: true })).toHaveValue("Bản nháp giữ khi lỗi"); page.once("dialog", d => d.accept()); await edit.getByRole("button", { name: "Hủy", exact: true }).click(); await expect(edit).toBeHidden();
  await panel(page).getByRole("tab", { name: "Lịch sử", exact: true }).click(); await panel(page).getByRole("button", { name: "Sửa sai bằng đảo giao dịch" }).first().click(); const undo = page.getByRole("dialog", { name: "Đảo giao dịch", exact: true }); await undo.getByLabel("Lý do", { exact: true }).fill("Ghi nhầm lần nhập"); await undo.getByRole("button", { name: "Cập nhật số dư", exact: true }).click(); await expect(undo.getByRole("alert")).toContainText("Đã cập nhật số dư"); await undo.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(undo).toBeHidden(); await expect(panel(page).getByText("Đã đảo", { exact: true })).toBeVisible(); await stock(20);
});

test("inventory-only VIEW can read but cannot mutate or open assets; NONE gets no data", async ({ page, context }) => {
  await signAccount(context, viewer); await openItem(page); await expect(panel(page).getByRole("button", { name: "Nhập hàng", exact: true })).toHaveCount(0); await expect(page.getByRole("button", { name: "Thêm mặt hàng", exact: true })).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Close", exact: true }).click(); await expect(panel(page)).toBeHidden(); await page.goto("/asset-management"); await expect(page.getByRole("navigation", { name: "Hạng mục quản lý" }).getByRole("link")).toHaveCount(2); await page.goto("/assets"); await expect(page.getByText("Không thể truy cập tài sản", { exact: true })).toBeVisible();
  await context.clearCookies(); await signAccount(context, none); await page.goto(`/inventory?kind=accessory&item=${itemId}`); await expect(page.getByText("Không thể truy cập vật tư", { exact: true })).toBeVisible(); await expect(page.getByText("Chuột không dây", { exact: true })).toHaveCount(0);
});

test("revoking permission while a form is open prevents writes and preserves draft", async ({ page, context }) => {
  await signAccount(context, manager); await openItem(page); await panel(page).getByRole("button", { name: "Nhập hàng", exact: true }).click(); const receipt = page.getByRole("dialog", { name: "Nhập hàng", exact: true }); await pick(page, "Nơi nhập", "Tủ vật tư HCNS");
  await db.vai_tro_quyen.delete({ where: { role_id_permission_id: { role_id: role, permission_id: grant } } });
  try { await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt.getByRole("alert")).toContainText("chưa được cấp quyền"); await expect(receipt.getByLabel("Số lượng", { exact: true })).toHaveValue("1"); await stock(20); } finally { await db.vai_tro_quyen.create({ data: { role_id: role, permission_id: grant } }); }
});

test("mobile and dark mode keep forms/panels usable without page overflow", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/inventory?kind=accessory"); await expect(table(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "outputs/inventory/mobile-light.png", fullPage: true });
  await table(page).getByRole("button", { name: "Mở mặt hàng Chuột không dây", exact: true }).click(); await panel(page).getByRole("button", { name: "Cấp phát", exact: true }).click(); await page.getByRole("combobox", { name: "Người nhận", exact: true }).click(); const search = page.getByRole("combobox", { name: "Tìm người nhận", exact: true }); await search.fill("nguyen an"); await search.press("Enter"); await expect(page.getByRole("combobox", { name: "Người nhận", exact: true })).toContainText("Nguyễn An");
  await page.screenshot({ path: "outputs/inventory/mobile-form.png", fullPage: true });
  page.once("dialog", d => d.accept()); await page.getByRole("dialog", { name: "Cấp phát", exact: true }).getByRole("button", { name: "Hủy", exact: true }).click();
  await page.evaluate(() => localStorage.setItem("theme", "dark")); await page.reload(); await expect(page.locator("html")).toHaveClass(/dark/);
  await panel(page).getByRole("button", { name: "Cấp phát", exact: true }).click(); await expect(page.getByRole("dialog", { name: "Cấp phát", exact: true })).toHaveCSS("background-color", "rgb(2, 8, 23)");
  await page.screenshot({ path: "outputs/inventory/mobile-dark.png", fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("consumables issue to a department without accessory return obligations", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/inventory?kind=consumable");
  await page.getByRole("button", { name: "Thêm loại mặt hàng", exact: true }).click(); const category = page.getByRole("dialog", { name: "Thêm loại mặt hàng", exact: true });
  await category.getByLabel("Mã loại", { exact: true }).fill("MUC"); await category.getByLabel("Tên loại", { exact: true }).fill("Mực in"); await category.getByRole("button", { name: "Lưu loại", exact: true }).click(); await expect(category).toBeHidden();
  await page.getByRole("button", { name: "Thêm mặt hàng", exact: true }).click(); const item = page.getByRole("dialog", { name: "Thêm mặt hàng", exact: true });
  await item.getByLabel("Tên mặt hàng", { exact: true }).fill("Mực Canon 057"); await pick(page, "Loại mặt hàng", "Mực in"); await item.getByLabel("Đơn vị tính", { exact: true }).fill("hộp"); await item.getByRole("button", { name: "Lưu mặt hàng" }).click(); await expect(item).toBeHidden();
  await expect(panel(page).getByRole("tab", { name: "Đang cấp", exact: true })).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Nhập hàng", exact: true }).click(); const receipt = page.getByRole("dialog", { name: "Nhập hàng", exact: true }); await receipt.getByLabel("Số lượng", { exact: true }).fill("10"); await receipt.getByLabel("Đơn giá (VND)").fill("100000"); await receipt.getByLabel("Đơn giá (VND)").fill(""); await receipt.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(receipt).toBeHidden();
  await expect(panel(page).getByText("10 hộp", { exact: true })).toBeVisible(); await panel(page).getByRole("button", { name: "Ghi nhận sử dụng", exact: true }).click(); const issue = page.getByRole("dialog", { name: "Ghi nhận sử dụng", exact: true }); await pick(page, "Phòng nhận", "Phòng HCNS"); await issue.getByRole("button", { name: "Xác nhận ghi nhận" }).click(); await expect(issue).toBeHidden(); await expect(panel(page).getByText("9 hộp", { exact: true })).toBeVisible();
  await panel(page).getByRole("tab", { name: "Lịch sử", exact: true }).click(); await expect(panel(page).getByText("Phòng HCNS", { exact: true })).toBeVisible();
});


test("pooled initial quantity, use, low stock, detail link and mobile layout", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/inventory?kind=consumable");
  await page.getByRole("button", { name: "Thêm mặt hàng", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm mặt hàng", exact: true });
  await form.getByLabel("Tên mặt hàng", { exact: true }).fill("Mực 140g");
  await pick(page, "Loại mặt hàng", "Mực in");
  await form.getByLabel("Đơn vị tính", { exact: true }).fill("20");
  await form.getByLabel("Số lượng ban đầu", { exact: true }).fill("20");
  await form.getByLabel("Mức tồn tối thiểu").fill("18");
  await form.getByRole("button", { name: "Lưu mặt hàng" }).click();
  await expect(form.getByText(/Đơn vị là lọ/)).toBeVisible();
  await form.getByLabel("Đơn vị tính", { exact: true }).fill("lọ");
  await form.getByRole("button", { name: "Lưu mặt hàng" }).click();
  await expect(form).toBeHidden(); await expect(panel(page).getByText("20 lọ", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("item")).toBeTruthy();
  await panel(page).getByRole("button", { name: "Ghi nhận sử dụng", exact: true }).click();
  const use = page.getByRole("dialog", { name: "Ghi nhận sử dụng", exact: true });
  await expect(use.getByRole("combobox", { name: "Nơi xuất" })).toHaveCount(0);
  await use.getByLabel("Số lượng", { exact: true }).fill("21");
  await pick(page, "Phòng nhận", "Phòng HCNS");
  await use.getByRole("button", { name: "Xác nhận ghi nhận" }).click();
  await expect(use.getByRole("alert")).toContainText("vượt tồn");
  await expect(use.getByLabel("Số lượng", { exact: true })).toHaveValue("21");
  await use.getByLabel("Số lượng", { exact: true }).fill("2");
  await expect(use.getByLabel("Số lượng dự kiến")).toContainText("20 → 18");
  await use.getByRole("button", { name: "Xác nhận ghi nhận" }).click();
  await expect(use).toBeHidden(); await page.reload();
  await expect(panel(page).locator("strong").filter({ hasText: /^18 lọ$/ })).toBeVisible();
  await panel(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(table(page).getByRole("row").filter({ hasText: "Mực 140g" })).toContainText("Sắp hết");
  await page.setViewportSize({ width: 390, height: 844 });
  await table(page).getByRole("button", { name: "Mở mặt hàng Mực 140g", exact: true }).click();
  await expect(panel(page).getByRole("button", { name: "Sửa thông tin", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ animations: "disabled", path: "outputs/it-consumables/mobile-detail.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ animations: "disabled", path: "outputs/it-consumables/mobile-dark.png" });
});
