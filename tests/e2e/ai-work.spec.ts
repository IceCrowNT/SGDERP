import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_system_settings_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable database and mocked provider required");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
const db = new PrismaClient();
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
async function propose(page: Page, months = 60) {
  const before = await db.cong_viec_ai.count({ where: { account_id: manager.id } });
  await chat(page).getByRole("textbox", { name: "Yêu cầu AI" }).fill(`Đặt khấu hao mặc định tất cả loại tài sản thành ${months} tháng`);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect.poll(() => db.cong_viec_ai.count({ where: { account_id: manager.id } })).toBe(before + 1);
  await expect(chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
  await expect(chat(page).getByRole("log")).toContainText("Đã lập bảng công việc");
  const record = await db.cong_viec_ai.findFirstOrThrow({ where: { account_id: manager.id }, orderBy: { id: "desc" } });
  const card = page.getByRole("article", { name: `Công việc AI ${record.id}`, exact: true });
  await expect(card).toBeVisible();
  return { record, card };
}
test.beforeAll(async () => {
  manager = await db.tai_khoan.findUniqueOrThrow({ where: { id: Number(process.env.AI_SETTINGS_TEST_ACCOUNT_ID) } });
  await db.loai_tai_san.createMany({ data: [
    { company_id: manager.company_id, ma_loai: "PRINTER", ten_loai: "Máy in HCNS", khau_hao_mac_dinh_thang: 36 },
    { company_id: manager.company_id, ma_loai: "PC", ten_loai: "Máy tính", khau_hao_mac_dinh_thang: 60 },
    { company_id: manager.company_id, ma_loai: "OLD", ten_loai: "Thiết bị ngừng dùng", dang_su_dung: false },
  ] });
});
test.afterAll(async () => db.$disconnect());

test("preview includes real before/after, persists on reload and commits only after approval", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/");
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const { record, card } = await propose(page);
  await expect(card).toContainText("36 tháng (3 năm)"); await expect(card).toContainText("60 tháng (5 năm)");
  await expect(card).toContainText("Ngừng dùng"); await expect(card).toContainText("2 loại cần đổi");
  expect(await db.loai_tai_san.count({ where: { company_id: manager.company_id, khau_hao_mac_dinh_thang: 60 } })).toBe(1);
  await page.reload(); await expect(card).toContainText("Chờ bạn duyệt");
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click(); await expect(card).not.toBeVisible();
  await page.getByRole("tab", { name: "Việc của tôi", exact: true }).click();
  await page.getByRole("region", { name: "Công việc AI đã lưu" }).getByRole("button", { name: /Khấu hao mặc định loại tài sản/ }).first().click(); await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Duyệt và thực hiện (2)", exact: true }).click();
  await expect(card).toContainText("Đã cập nhật 2 loại; 1 loại không cần đổi.");
  await expect(card.getByRole("button", { name: /Duyệt và thực hiện/ })).toHaveCount(0);
  expect(await db.loai_tai_san.count({ where: { company_id: manager.company_id, khau_hao_mac_dinh_thang: 60 } })).toBe(3);
  expect(await db.nhat_ky_hoat_dong.count({ where: { doi_tuong_id: `cong_viec_ai:${record.id}`, hanh_dong: "AI_WORK_APPROVE" } })).toBe(1);
  await page.screenshot({ path: "outputs/ai-work-approval/desktop-completed.png", fullPage: true });
  await page.reload(); await expect(card).toContainText("Đã hoàn tất"); expect(errors).toEqual([]);
});

test("stale snapshot requires refresh and another click; adjustment cancels old approval", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/");
  const { record, card } = await propose(page, 48);
  const category = await db.loai_tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, ma_loai: "PRINTER" } });
  await db.loai_tai_san.update({ where: { id: category.id }, data: { khau_hao_mac_dinh_thang: 24 } });
  await card.getByRole("button", { name: "Duyệt và thực hiện (3)", exact: true }).click();
  await expect(card).toContainText("Danh mục đã thay đổi sau khi lập bảng");
  expect((await db.loai_tai_san.findUniqueOrThrow({ where: { id: category.id } })).khau_hao_mac_dinh_thang).toBe(24);
  await card.getByRole("button", { name: "Làm mới bảng để duyệt lại", exact: true }).click();
  await expect.poll(async () => (await db.cong_viec_ai.findUniqueOrThrow({ where: { id: record.id } })).phien_ban).toBe(2); await expect(card).toContainText("24 tháng (2 năm)");
  await expect(card.getByRole("button", { name: "Duyệt và thực hiện (3)", exact: true })).toBeEnabled();
  await card.getByRole("button", { name: "Điều chỉnh yêu cầu", exact: true }).click();
  await expect(card).toContainText("Đã hủy công việc");
  await expect(chat(page).getByRole("textbox", { name: "Yêu cầu AI" })).toHaveValue("Đặt khấu hao mặc định cho tất cả loại tài sản thành 48 tháng");
  expect((await db.cong_viec_ai.findUniqueOrThrow({ where: { id: record.id } })).trang_thai).toBe("DA_HUY");
});

test("mobile and dark mode keep table scroll local; cancel survives reload", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  const { card } = await propose(page, 48);
  await expect(card.getByRole("region", { name: "Bảng khấu hao trước và sau" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await card.scrollIntoViewIfNeeded(); await page.screenshot({ path: "outputs/ai-work-approval/mobile-preview.png", fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "outputs/ai-work-approval/mobile-dark.png", fullPage: true });
  await card.getByRole("button", { name: "Hủy công việc", exact: true }).click(); await expect(card).toContainText("Đã hủy công việc");
  await page.reload(); await expect(card).toContainText("Đã hủy công việc");
});
