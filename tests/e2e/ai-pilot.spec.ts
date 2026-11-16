import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_ai_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated AI database and mock provider only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient();
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, other: Account, assetId: number;
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
const editor = (page: Page) => page.getByRole("dialog", { name: "Kiểm tra hồ sơ trước khi lưu" });
async function ask(page: Page, message: string) {
  await chat(page).getByRole("textbox", { name: "Yêu cầu AI" }).fill(message);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page).getByRole("button", { name: "Kiểm tra và lưu", exact: true })).toBeVisible();
}
test.beforeAll(async () => {
  manager = await db.tai_khoan.findFirstOrThrow({ where: { ten_dang_nhap: { startsWith: "ai-manager-" } }, orderBy: { id: "desc" } });
  other = await db.tai_khoan.findFirstOrThrow({ where: { company_id: manager.company_id, ten_hien_thi: "other" } });
  assetId = (await db.tai_san.findFirstOrThrow({ where: { company_id: manager.company_id, so_serial: "KEEP-SERIAL" } })).id;
});
test.afterAll(async () => db.$disconnect());

test("only the bound account sees chat; create draft stays unsaved until the existing form submits", async ({ page, context }) => {
  await signAccount(context, other); await page.goto("/"); await expect(chat(page)).toHaveCount(0);
  await signAccount(context, manager); await page.goto("/"); await expect(chat(page)).toBeVisible();
  const before = await db.tai_san.count({ where: { company_id: manager.company_id } });
  await ask(page, "Thêm một tài sản AI thử nghiệm");
  await expect(chat(page)).toContainText("Chưa lưu");
  expect(await db.tai_san.count({ where: { company_id: manager.company_id } })).toBe(before);
  await chat(page).getByRole("button", { name: "Kiểm tra và lưu" }).click();
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Tài sản AI thử nghiệm");
  await editor(page).getByLabel("Tên tài sản", { exact: true }).fill("Tài sản AI người dùng đã kiểm tra");
  await editor(page).getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(editor(page)).not.toBeVisible();
  await expect(chat(page)).toContainText("Đã lưu hồ sơ tài sản.");
  expect(await db.tai_san.count({ where: { company_id: manager.company_id } })).toBe(before + 1);
  await expect(chat(page).getByRole("link", { name: "Mở hồ sơ" })).toHaveAttribute("href", /\/assets\?asset=\d+/);
  await page.screenshot({ path: "outputs/ai-pilot/dashboard.png", animations: "disabled", fullPage: true });
});

test("editing retains serial/finance and rejects a stale draft without dismissing it", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/");
  await ask(page, "Đổi tên máy in hiện tại");
  await chat(page).getByRole("button", { name: "Kiểm tra và lưu" }).click();
  await expect(editor(page).getByLabel("Serial / Service tag", { exact: true })).toHaveValue("KEEP-SERIAL");
  await expect(editor(page).getByLabel("Giá mua (VND)", { exact: true })).toHaveValue("12000000");
  const row = await db.tai_san.findUniqueOrThrow({ where: { id: assetId } });
  await db.tai_san.update({ where: { id: assetId }, data: { updated_at: new Date(row.updated_at.getTime() + 5000) } });
  await editor(page).getByRole("button", { name: "Lưu tài sản" }).click();
  await expect(editor(page).getByRole("alert")).toContainText("Hồ sơ đã thay đổi");
  await expect(editor(page).getByLabel("Tên tài sản", { exact: true })).toHaveValue("Máy in đã sửa bằng AI");
  await editor(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await chat(page).getByRole("button", { name: "Bỏ bản nháp" }).click();
  await ask(page, "Đổi tên máy in hiện tại");
  await chat(page).getByRole("button", { name: "Kiểm tra và lưu" }).click();
  await editor(page).getByRole("button", { name: "Lưu tài sản" }).click(); await expect(editor(page)).not.toBeVisible();
  const after = await db.tai_san.findUniqueOrThrow({ where: { id: assetId } });
  expect(after.ten_tai_san).toBe("Máy in đã sửa bằng AI"); expect(after.so_serial).toBe("KEEP-SERIAL"); expect(after.gia_mua?.toString()).toBe("12000000");
});

test("location draft can be saved on mobile; light/dark layouts fit and chat clears on reload", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  await ask(page, "Thêm vị trí thử nghiệm");
  await chat(page).getByRole("button", { name: "Kiểm tra và lưu" }).click();
  await expect(editor(page).getByLabel("Tên vị trí", { exact: true })).toHaveValue("Vị trí AI thử nghiệm");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/ai-pilot/mobile-${theme}.png`, animations: "disabled" });
  }
  await editor(page).getByRole("button", { name: "Lưu vị trí", exact: true }).click(); await expect(editor(page)).not.toBeVisible();
  await expect(chat(page)).toContainText("Đã lưu vị trí.");
  expect(await db.vi_tri.count({ where: { company_id: manager.company_id, ten_vi_tri: "Vị trí AI thử nghiệm" } })).toBe(1);
  await page.reload(); await expect(chat(page)).not.toContainText("Đã lưu vị trí.");
  await expect(chat(page).getByText("Bạn muốn tra cứu hoặc cập nhật hồ sơ nào?")).toBeVisible();
});
