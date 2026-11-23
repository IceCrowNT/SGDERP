import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { signAccount } from "../helpers/account-fixture";
test.skip(!/^\/sdg_system_settings_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable database/mock API only");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
const db = new PrismaClient();
let secondAssetId: number;
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
async function send(page: Page, message: string) {
  const before = await db.tin_nhan_ai.count({ where: { hoi_thoai: { account_id: manager.id }, vai_tro: "TRO_LY", trang_thai: "HOAN_TAT" } });
  await chat(page).getByRole("textbox", { name: "Yêu cầu AI" }).fill(message);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect.poll(() => db.tin_nhan_ai.count({ where: { hoi_thoai: { account_id: manager.id }, vai_tro: "TRO_LY", trang_thai: "HOAN_TAT" } })).toBe(before + 1);
  await expect(chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
}
async function preferences(page: Page, text: string) {
  await page.goto("/profile");
  await page.getByRole("textbox", { name: "Bối cảnh và cách AI trả lời", exact: true }).fill(text);
  await expect(page.getByRole("textbox", { name: "Bối cảnh và cách AI trả lời", exact: true })).toHaveValue(text);
  const response = page.waitForResponse(r => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]));
  await page.getByRole("button", { name: "Lưu cài đặt AI", exact: true }).click();
  expect(await (await response).text()).toContain('"success":true');
  await expect(page.getByText("Đã lưu. Áp dụng từ lượt chat tiếp theo.", { exact: true })).toBeVisible();
}
test.beforeAll(async () => {
  manager = await db.tai_khoan.findUniqueOrThrow({ where: { id: Number(process.env.AI_SETTINGS_TEST_ACCOUNT_ID) } });
  const category = await db.loai_tai_san.create({ data: { company_id: manager.company_id, ma_loai: "CTX", ten_loai: "Máy in bối cảnh" } });
  await db.tai_san.create({ data: { company_id: manager.company_id, loai_tai_san_id: category.id, ten_tai_san: "Máy in số một" } });
  secondAssetId = (await db.tai_san.create({ data: { company_id: manager.company_id, loai_tai_san_id: category.id, ten_tai_san: "Máy in số hai" } })).id;
});
test.afterAll(async () => db.$disconnect());

test("profile stores personal instructions and applies latest settings on next turn", async ({ page, context }) => {
  await signAccount(context, manager); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await preferences(page, "Trả lời ngắn bằng tiếng Việt — STYLE-ONE");
  await page.reload(); await expect(page.getByRole("textbox", { name: "Bối cảnh và cách AI trả lời" })).toHaveValue("Trả lời ngắn bằng tiếng Việt — STYLE-ONE");
  await page.goto("/?aiChat=new"); await send(page, "Xin chào lần đầu");
  await expect(chat(page).getByRole("log")).toContainText("Cách trả lời: Trả lời ngắn bằng tiếng Việt — STYLE-ONE");
  const url = page.url();
  await preferences(page, "STYLE-TWO"); await page.goto(url); await send(page, "Xin chào lần tiếp theo");
  await expect(chat(page).getByRole("log")).toContainText("Cách trả lời: STYLE-TWO");
  await expect(chat(page).getByRole("log")).toContainText("STYLE-ONE");
  await preferences(page, ""); await page.reload(); await expect(page.getByRole("textbox", { name: "Bối cảnh và cách AI trả lời" })).toHaveValue("");
  await page.screenshot({ path: "outputs/ai-chat-context/profile-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("reload restores context, new chat isolates it, archived chat can be reopened", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/?aiChat=new");
  await send(page, "Ghi nhớ mã: HCNS-TEST-2026"); const original = page.url();
  await page.reload(); await expect(chat(page).getByRole("log")).toContainText("HCNS-TEST-2026");
  await send(page, "Nhắc lại mã"); await expect(chat(page).getByRole("log")).toContainText("Bối cảnh: Ghi nhớ mã: HCNS-TEST-2026");
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click();
  await send(page, "Nhắc lại mã"); await expect(chat(page).getByRole("log")).toContainText("Bối cảnh: chưa có mã");
  await expect(chat(page).getByRole("log")).not.toContainText("HCNS-TEST-2026");
  await page.goto(original); await expect(chat(page).getByRole("log")).toContainText("HCNS-TEST-2026");
  await chat(page).getByRole("button", { name: "Thao tác cuộc chat", exact: true }).click();
  await page.getByRole("menuitem", { name: "Lưu trữ chat", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(chat(page)).toContainText("Cuộc chat đã lưu trữ.");
  await expect(chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeDisabled();
  await page.reload(); await expect(chat(page).getByRole("log")).toContainText("HCNS-TEST-2026");
  await page.getByRole("complementary", { name: "Lịch sử hội thoại", exact: true }).getByRole("button", { name: "Đã lưu trữ", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Lịch sử hội thoại", exact: true }).getByRole("button", { name: /Ghi nhớ mã:/ })).toHaveCount(1);
  await chat(page).getByRole("button", { name: "Thao tác cuộc chat", exact: true }).click();
  await page.getByRole("menuitem", { name: "Khôi phục chat", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
  await page.screenshot({ path: "outputs/ai-chat-context/chat-desktop.png", fullPage: true });
});

test("personal settings remain separate for another account; mobile history and profile fit", async ({ page, context }) => {
  const other = await db.tai_khoan.findFirstOrThrow({ where: { company_id: manager.company_id, ten_hien_thi: "other" } });
  await signAccount(context, other); await page.setViewportSize({ width: 390, height: 844 });
  await preferences(page, "OTHER-USER-STYLE");
  expect((await db.tai_khoan.findUniqueOrThrow({ where: { id: manager.id } })).huong_dan_ai_ca_nhan).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/ai-chat-context/profile-mobile.png", fullPage: true });
  await page.goto("/"); await expect(chat(page)).toHaveCount(0);
  await signAccount(context, manager); await page.goto("/");
  await expect(chat(page).getByRole("button", { name: "Chat mới", exact: true })).toBeEnabled();
  await chat(page).getByRole("button", { name: "Lịch sử chat", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/ai-chat-context/chat-mobile.png", fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: "outputs/ai-chat-context/chat-mobile-dark.png", fullPage: true });
});

test("ordered references survive reload and a follow-up reads the current record", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/?aiChat=new");
  await send(page, "Tìm máy in để tham chiếu");
  const results = chat(page).getByRole("log").getByRole("list").last();
  await expect(results.getByRole("listitem").nth(0)).toContainText("Máy in số một");
  await expect(results.getByRole("listitem").nth(1)).toContainText("Máy in số hai");
  await page.reload(); await expect(results.getByRole("listitem").nth(1)).toContainText("Máy in số hai");
  await db.tai_san.update({ where: { id: secondAssetId }, data: { ten_tai_san: "Máy in tên mới" } });
  await send(page, "Chiếc thứ hai đang tên gì?");
  await expect(chat(page).getByRole("log")).toContainText("Đọc hiện tại: Máy in tên mới");
});
