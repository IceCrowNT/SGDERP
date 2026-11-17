import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_system_settings_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Isolated settings database and mock provider only");
test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);
const db = new PrismaClient();
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, other: Account, operator: Account, checkRequest: Request;
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
const form = (page: Page) => page.getByRole("form", { name: "Cài đặt kết nối AI" });
const current = () => db.ket_noi_ai.findFirstOrThrow({ where: { company_id: manager.company_id, la_mac_dinh: true } });
async function open(page: Page) {
  await page.goto("/settings/ai");
  await page.getByRole("button", { name: "Chỉnh sửa / thay key", exact: true }).first().click();
  await expect(form(page).getByRole("button", { name: "Lưu cài đặt", exact: true })).toBeEnabled({ timeout: 20000 });
}
async function setModel(page: Page, model: string) {
  await expect(form(page).getByRole("button", { name: "Lưu cài đặt", exact: true })).toBeEnabled({ timeout: 20000 });
  if (!await form(page).getByRole("textbox", { name: "Model", exact: true }).count()) await form(page).getByRole("button", { name: "Nhập tên model thủ công", exact: true }).click();
  await form(page).getByRole("textbox", { name: "Model", exact: true }).fill(model);
}
async function save(page: Page) {
  const response = page.waitForResponse(r => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]));
  await form(page).getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  const text = await (await response).text();
  expect(text).toContain('"success":true');
  expect(text).not.toContain("sk-ui-only-key");
  await expect(form(page).getByLabel("API key mới", { exact: true })).toHaveValue("");
  await expect(form(page).getByRole("button", { name: "Lưu cài đặt", exact: true })).toBeEnabled();
}
async function ask(page: Page, model: string) {
  await page.goto("/");
  await chat(page).getByRole("textbox", { name: "Yêu cầu AI" }).fill("Kiểm tra kết nối");
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page)).toContainText(`Đang dùng ${model}`);
}
test.beforeAll(async () => {
  manager = await db.tai_khoan.findFirstOrThrow({ where: { ...(process.env.AI_SETTINGS_TEST_ACCOUNT_ID ? { id: Number(process.env.AI_SETTINGS_TEST_ACCOUNT_ID) } : { ten_dang_nhap: { startsWith: "ai-key-manager-" } }) }, orderBy: { id: "desc" } });
  other = await db.tai_khoan.findFirstOrThrow({ where: { company_id: manager.company_id, ten_hien_thi: "other" } });
  operator = await db.tai_khoan.findFirstOrThrow({ where: { company_id: manager.company_id, ten_dang_nhap: { startsWith: "ai-operator-" } } });
});
test.beforeEach(async () => {
  await db.nhat_ky_hoat_dong.deleteMany({ where: { company_id: manager.company_id, phan_he: "AI", hanh_dong: "AI_KEY_TEST" } });
});
test.afterAll(async () => db.$disconnect());

test("settings navigation respects grants; configuration moved from chat and saves a tested key/model", async ({ page, context }) => {
  await signAccount(context, other);
  for (const path of ["/settings", "/settings/ai"]) {
    await page.goto(path); await expect(page.getByRole("heading", { name: "Chưa có quyền truy cập cài đặt" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cài đặt chung", exact: true })).toHaveCount(0);
  }
  await signAccount(context, manager); await page.goto("/"); await expect(chat(page)).toBeVisible();
  await expect(chat(page).getByRole("button", { name: "Cài đặt AI", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Cài đặt chung", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cài đặt chung", exact: true })).toBeVisible();
  await page.locator('a[href="/settings/ai"]').last().click();
  await page.getByRole("button", { name: "Thêm kết nối", exact: true }).click();
  await form(page).getByLabel("Tên kết nối", { exact: true }).fill("Kết nối chính");
  await setModel(page, "test-model-one");
  await form(page).getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(form(page)).toContainText("Nhập API key.");
  await form(page).getByLabel("API key", { exact: true }).fill("sk-ui-only-key-FIRST-1111");
  const request = page.waitForRequest(r => r.method() === "POST" && Boolean(r.headers()["next-action"]));
  await form(page).getByRole("button", { name: "Kiểm tra khóa và tải model" }).click(); checkRequest = await request;
  await expect(form(page)).toContainText("model từ OpenAI");
  await form(page).getByRole("combobox", { name: "Model", exact: true }).click();
  await page.getByRole("option", { name: "test-model-two", exact: true }).click();
  await save(page); expect((await current()).model_mac_dinh).toBe("test-model-two"); await ask(page, "test-model-two");
});

test("model change preserves key; rotation and pause apply to chat without restart", async ({ page, context }) => {
  await signAccount(context, manager); await open(page);
  await expect(form(page)).toContainText("••••1111"); await expect(form(page).getByLabel("API key mới", { exact: true })).toHaveValue("");
  const before = await current();
  await setModel(page, "test-model-one"); await save(page);
  expect((await current()).tham_chieu_bi_mat).toBe(before.tham_chieu_bi_mat); expect((await current()).phien_ban_khoa).toBe(before.phien_ban_khoa);
  await ask(page, "test-model-one"); await open(page);
  await form(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-SECOND-2222"); await save(page);
  expect((await current()).phien_ban_khoa).toBe(before.phien_ban_khoa + 1); await expect(form(page)).toContainText("••••2222");
  await form(page).getByRole("checkbox", { name: "Cho phép sử dụng kết nối" }).uncheck(); await save(page);
  await page.goto("/"); await expect(chat(page)).toContainText("đang tạm dừng"); await expect(chat(page).getByRole("textbox", { name: "Yêu cầu AI" })).toHaveCount(0);
  await open(page); await form(page).getByRole("checkbox", { name: "Cho phép sử dụng kết nối" }).check(); await save(page);
  await page.goto("/"); await expect(chat(page).getByRole("textbox", { name: "Yêu cầu AI" })).toBeEnabled();
});

test("failed check keeps saved configuration; mobile light/dark form fits and discard clears typed key", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  const before = await current(); await form(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-INVALID-3333");
  await form(page).getByRole("button", { name: "Kiểm tra khóa và tải model" }).click();
  await expect(form(page).getByRole("alert")).toContainText("OpenAI không chấp nhận khóa này"); expect(await current()).toEqual(before);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `outputs/ai-multiple-keys/mobile-${theme}.png`, animations: "disabled", fullPage: true });
  }
  await form(page).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(form(page).getByLabel("API key mới", { exact: true })).toHaveValue(""); await expect(form(page)).toContainText("••••2222");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("combobox", { name: "Mục cài đặt" }).click(); await page.getByRole("option", { name: "Tổng quan cài đặt", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("two tabs detect stale data and explicit reload picks up the new configuration", async ({ page, context }) => {
  await signAccount(context, manager); await open(page); const second = await context.newPage(); await open(second);
  await setModel(page, "test-model-two"); await save(page);
  await setModel(second, "stale-model");
  await form(second).getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(form(second).getByRole("alert")).toContainText("Cài đặt đã thay đổi"); await expect(form(second).getByLabel("Model", { exact: true })).toHaveValue("stale-model");
  expect((await current()).model_mac_dinh).toBe("test-model-two");
  await form(second).getByRole("button", { name: "Tải lại cài đặt" }).click(); await expect(form(second).getByRole("combobox", { name: "Model", exact: true })).toContainText("test-model-two"); await second.close();
});

test("AI-only operator can configure but not chat or grant roles; replayed action denies an ungranted admin", async ({ page, context }) => {
  await signAccount(context, operator); await open(page); await expect(page.getByRole("link", { name: "Phân quyền vai trò", exact: true })).toHaveCount(0);
  await page.goto("/"); await expect(chat(page)).toHaveCount(0);
  await signAccount(context, other); await page.goto("/settings/ai");
  const body = await (await page.request.post("/settings/ai", { headers: { "Next-Action": checkRequest.headers()["next-action"], "Content-Type": checkRequest.headers()["content-type"] }, data: JSON.stringify([{target: (await current()).id, version: (await current()).updated_at.toISOString(), apiKey: "sk-ui-only-key-FIRST-1111"}]) })).text();
  expect(body).toContain('"success":false'); expect(body).not.toContain("sk-ui-only-key");
});

test("role checkbox grants and revokes settings on the next request", async ({ page, context, browser }) => {
  await signAccount(context, manager); const operatorContext = await browser.newContext(); await signAccount(operatorContext, operator); const operatorPage = await operatorContext.newPage();
  try {
    await open(operatorPage);
    for (const enabled of [false, true]) {
      await page.goto("/roles");
      await page.getByRole("button", { name: "Sửa vai trò AI only", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("checkbox", { name: "Quản lý kết nối & model AI", exact: true }).setChecked(enabled);
      await dialog.getByRole("button", { name: "Lưu vai trò", exact: true }).click(); await expect(dialog).not.toBeVisible();
      await operatorPage.goto("/settings/ai");
      if (enabled) await expect(operatorPage.getByRole("button", { name: "Thêm kết nối", exact: true })).toBeVisible();
      else await expect(operatorPage.getByRole("heading", { name: "Chưa có quyền truy cập cài đặt" })).toBeVisible();
    }
  } finally { await operatorContext.close(); }
});

test("saved key loads models once automatically; search/select preserves unknown current model until save", async ({ page, context }) => {
  await signAccount(context, manager);
  await db.ket_noi_ai.update({ where: { id: (await current()).id }, data: { model_mac_dinh: "retired-model" } });
  const requests = () => db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, account_id: manager.id, phan_he: "AI", hanh_dong: "AI_KEY_TEST" } });
  await open(page);
  await expect(form(page)).toContainText("Đã tải 2 model từ OpenAI");
  expect(await requests()).toBe(1);
  const select = form(page).getByRole("combobox", { name: "Model", exact: true });
  await expect(select).toContainText("retired-model");
  await select.click();
  await expect(page.getByRole("option", { name: "retired-model", exact: true })).toBeVisible();
  await page.screenshot({ path: "outputs/ai-multiple-keys/model-dropdown.png", animations: "disabled", fullPage: true });
  await page.getByRole("combobox", { name: "Tìm model", exact: true }).fill("TEST-MODEL-ONE");
  await page.getByRole("option", { name: "test-model-one", exact: true }).click();
  expect((await current()).model_mac_dinh).toBe("retired-model");
  await save(page); expect((await current()).model_mac_dinh).toBe("test-model-one");
  expect(await requests()).toBe(1);
});

test("empty provider list keeps selection and manual entry remains available without replacing configuration", async ({ page, context }) => {
  await signAccount(context, manager); await open(page);
  const before = await current();
  await form(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-EMPTY-4444");
  await form(page).getByRole("button", { name: "Kiểm tra khóa và tải model", exact: true }).click();
  await expect(form(page)).toContainText("Khóa này chưa trả về model nào");
  await expect(form(page).getByRole("combobox", { name: "Model", exact: true })).toContainText(before.model_mac_dinh);
  await setModel(page, "future-model"); expect(await current()).toEqual(before);
  await form(page).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(form(page)).toContainText("Đã tải 2 model từ OpenAI");
  await expect(form(page).getByRole("combobox", { name: "Model", exact: true })).toContainText(before.model_mac_dinh);
  expect(await current()).toEqual(before);
});

test("add a separate key, preserve the previous default and switch explicitly; edit only the selected key", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/settings/ai");
  const before = await current();
  await page.getByRole("button", { name: "Thêm kết nối", exact: true }).click();
  await form(page).getByLabel("Tên kết nối", { exact: true }).fill("OpenAI thử nghiệm");
  await form(page).getByLabel("API key", { exact: true }).fill("sk-ui-only-key-THIRD-5555");
  await form(page).getByRole("button", { name: "Kiểm tra khóa và tải model" }).click();
  await expect(form(page)).toContainText("Đã tải 2 model từ OpenAI");
  await form(page).getByRole("combobox", { name: "Model", exact: true }).click();
  await page.getByRole("option", { name: "test-model-two", exact: true }).click();
  await save(page); expect(await current()).toEqual(before);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const card = page.getByRole("article", { name: "OpenAI thử nghiệm", exact: true });
  await expect(card).toContainText("••••5555"); await expect(card).not.toContainText("Mặc định");
  await ask(page, before.model_mac_dinh); await page.goto("/settings/ai");
  await card.getByRole("button", { name: "Đặt làm mặc định", exact: true }).click();
  await expect(card.getByText("Mặc định", { exact: true })).toBeVisible();
  const next = await current(); expect(next.id).not.toBe(before.id);
  expect(await db.ket_noi_ai.count({ where: { company_id: manager.company_id } })).toBe(2);
  await ask(page, "test-model-two"); await page.goto("/settings/ai");
  await card.getByRole("button", { name: "Chỉnh sửa / thay key", exact: true }).click();
  await expect(form(page).getByRole("button", { name: "Lưu cài đặt", exact: true })).toBeEnabled();
  await form(page).getByLabel("API key mới", { exact: true }).fill("sk-ui-only-key-FOURTH-6666");
  await save(page); await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const preserved = await db.ket_noi_ai.findUniqueOrThrow({ where: { id: before.id } });
  expect(preserved.tham_chieu_bi_mat).toBe(before.tham_chieu_bi_mat); expect(preserved.phien_ban_khoa).toBe(before.phien_ban_khoa);
  await expect(card).toContainText("••••6666");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `outputs/ai-multiple-keys/list-${width}-${theme}.png`, animations: "disabled", fullPage: true });
    }
  }
});
