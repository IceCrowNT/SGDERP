import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_ai_keys_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated AI database and mock provider only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient();
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, other: Account;
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
const dialog = (page: Page) => page.getByRole("dialog", { name: "Kết nối OpenAI" });
const current = () => db.ket_noi_ai.findUniqueOrThrow({ where: { company_id: manager.company_id } });
async function open(page: Page) {
  await chat(page).getByRole("button", { name: "Cài đặt AI", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Lưu cài đặt", exact: true })).toBeVisible();
}
async function save(page: Page) {
  await dialog(page).getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
}
async function ask(page: Page, model: string) {
  await chat(page).getByRole("textbox", { name: "Yêu cầu AI" }).fill("Kiểm tra kết nối");
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page)).toContainText(`Đang dùng ${model}`);
}
test.beforeAll(async () => {
  manager = await db.tai_khoan.findFirstOrThrow({ where: { ten_dang_nhap: { startsWith: "ai-key-manager-" } }, orderBy: { id: "desc" } });
  other = await db.tai_khoan.findFirstOrThrow({ where: { company_id: manager.company_id, ten_hien_thi: "other" } });
});
test.afterAll(async () => db.$disconnect());

test("bound account can validate a key, choose a model and use chat immediately after saving", async ({ page, context }) => {
  await signAccount(context, other); await page.goto("/"); await expect(chat(page)).toHaveCount(0);
  await signAccount(context, manager); await page.goto("/"); await open(page);
  await dialog(page).getByLabel("Model", { exact: true }).fill("test-model-one");
  await dialog(page).getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(dialog(page)).toContainText("Nhập API key.");
  await dialog(page).getByLabel("API key", { exact: true }).fill("sk-ui-only-key-FIRST-1111");
  await dialog(page).getByRole("button", { name: "Kiểm tra khóa và tải model" }).click();
  await expect(dialog(page)).toContainText("Đã đọc được danh sách model");
  await dialog(page).getByRole("combobox", { name: "Model", exact: true }).click();
  await page.getByRole("option", { name: "test-model-two", exact: true }).click();
  await save(page);
  expect((await current()).model_mac_dinh).toBe("test-model-two");
  await ask(page, "test-model-two");
});

test("saved key stays hidden; model change preserves key; rotation and pause take effect without restart", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/"); await open(page);
  await expect(dialog(page)).toContainText("••••1111");
  await expect(dialog(page).getByLabel("API key mới", { exact: true })).toHaveValue("");
  const before = await current();
  await dialog(page).getByLabel("Model", { exact: true }).fill("test-model-one"); await save(page);
  expect((await current()).tham_chieu_bi_mat).toBe(before.tham_chieu_bi_mat);
  expect((await current()).phien_ban_khoa).toBe(before.phien_ban_khoa);
  await ask(page, "test-model-one");
  await open(page); await dialog(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-SECOND-2222"); await save(page);
  expect((await current()).phien_ban_khoa).toBe(before.phien_ban_khoa + 1);
  await open(page); await expect(dialog(page)).toContainText("••••2222");
  await dialog(page).getByRole("checkbox", { name: "Cho phép sử dụng kết nối" }).uncheck(); await save(page);
  await expect(chat(page)).toContainText("đang tạm dừng");
  await expect(chat(page).getByRole("textbox", { name: "Yêu cầu AI" })).toHaveCount(0);
  await open(page); await dialog(page).getByRole("checkbox", { name: "Cho phép sử dụng kết nối" }).check(); await save(page);
  await expect(chat(page).getByRole("textbox", { name: "Yêu cầu AI" })).toBeEnabled();
});

test("failed key test keeps saved configuration and mobile light/dark form fits", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/"); await open(page);
  const before = await current();
  await dialog(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-INVALID-3333");
  await dialog(page).getByRole("button", { name: "Kiểm tra khóa và tải model" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("OpenAI không chấp nhận khóa này");
  expect(await current()).toEqual(before);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await dialog(page).evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `outputs/ai-settings/mobile-${theme}.png`, animations: "disabled" });
  }
  await dialog(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await open(page); await expect(dialog(page).getByLabel("API key mới", { exact: true })).toHaveValue("");
  await expect(dialog(page)).toContainText("••••2222");
});
