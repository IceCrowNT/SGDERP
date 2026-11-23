import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import sharp from "sharp";
import { signAccount } from "../helpers/account-fixture";
import { wordFixture } from "../helpers/ai-file-fixtures";

test.skip(!/^\/sdg_ai_dashboard_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Requires isolated DB and mocked OpenAI");
test.setTimeout(90_000);
const db = new PrismaClient();
const fixture = process.env.AI_DASHBOARD_FIXTURE ? JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE, "utf8")) : {};
const chat = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
const input = (page: Page) => chat(page).getByRole("textbox", { name: "Yêu cầu AI" });
async function upload(page: Page, name: string, buffer: Buffer, mimeType = "application/octet-stream") {
  await chat(page).getByLabel("Chọn tệp đính kèm", { exact: true }).setInputFiles({ name, buffer, mimeType });
  await expect(chat(page).getByRole("button", { name: `Bỏ tệp ${name}`, exact: true })).toBeEnabled({ timeout: 25000 });
}
async function send(page: Page, message: string) {
  await expect(input(page)).toBeEnabled(); await input(page).fill(message);
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(input(page)).toHaveValue("", { timeout: 25000 });
}
test.beforeEach(async ({ page, context }) => {
  await db.tep_dinh_kem_ai.deleteMany({ where: { company_id: fixture.companyId, account_id: fixture.accounts.manager.id, hoi_thoai_id: null } });
  await db.nhat_ky_hoat_dong.updateMany({ where: { company_id: fixture.companyId, account_id: fixture.accounts.manager.id, phan_he: "AI", hanh_dong: { in: ["AI_REQUEST", "AI_DONE"] } }, data: { created_at: new Date(Date.now() - 600000) } });
  await signAccount(context, fixture.accounts.manager); await page.setViewportSize({ width: 1512, height: 982 }); await page.goto("/?aiChat=new"); await expect(input(page)).toBeEnabled({ timeout: 25000 });
});
test.afterAll(async () => db.$disconnect());

test("Excel sums all 1500 rows, persists file/table and follows up after reload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Phòng", "Giá"], ...Array.from({ length: 1500 }, (_, i) => [i % 2 ? "IT" : "HCNS", i + 1])]), "Tài sản");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const before = await db.nhat_ky_goi_ai.count({ where: { account_id: fixture.accounts.manager.id } });
  await upload(page, "tai-san.xlsx", buffer);
  expect(await db.nhat_ky_goi_ai.count({ where: { account_id: fixture.accounts.manager.id } })).toBe(before);
  await send(page, "TEST_FILES SHEET tổng giá theo phòng");
  const table = chat(page).getByRole("region", { name: "Bảng dữ liệu tai-san.xlsx · Tài sản", exact: true }).last();
  await expect(table).toContainText("562500"); await expect(table).toContainText("563250");
  await expect(chat(page).getByRole("log")).toContainText("Xét toàn bộ 1500 dòng");
  const conversationId = Number(new URL(page.url()).searchParams.get("aiChat"));
  const file = await db.tep_dinh_kem_ai.findFirstOrThrow({ where: { hoi_thoai_id: conversationId } });
  expect(file.tin_nhan_id).not.toBeNull();
  const response = await page.request.get(`/media/ai-attachments/${file.id}`); expect(response.status()).toBe(200); expect(await response.body()).toEqual(buffer); expect(response.headers()["cache-control"]).toContain("no-store");
  await page.reload(); await expect(input(page)).toBeEnabled(); await expect(table).toContainText("563250");
  await send(page, "TEST_FILES SHEET HCNS_ONLY tiếp tục chỉ lấy HCNS");
  await expect(chat(page).getByRole("region", { name: "Bảng dữ liệu tai-san.xlsx · Tài sản", exact: true }).last()).not.toContainText("563250");
  expect(await db.tep_dinh_kem_ai.count({ where: { hoi_thoai_id: conversationId } })).toBe(1);
  await page.screenshot({ path: "outputs/ai-attachments/excel-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "outputs/ai-attachments/excel-mobile-dark.png" });
  await chat(page).getByRole("button", { name: "Chat mới", exact: true }).click();
  await send(page, "TEST_FILES SHEET"); await expect(chat(page).getByRole("log")).toContainText("Không có tệp trong cuộc chat này.");
  expect(errors).toEqual([]);
});

test("Word and image are read through tools; original and preview stay private", async ({ page, context }) => {
  await upload(page, "ban-giao.docx", wordFixture()); await send(page, "TEST_FILES WORD đọc biên bản");
  await expect(chat(page).getByRole("log")).toContainText("ABC-123");
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: "white" } }).png().toBuffer();
  await upload(page, "may-in.png", png, "image/png"); await send(page, "TEST_FILES IMAGE đọc ảnh");
  await expect(chat(page).getByRole("log")).toContainText("Đã nhận ảnh để phân tích.");
  const id = Number(new URL(page.url()).searchParams.get("aiChat"));
  const file = await db.tep_dinh_kem_ai.findFirstOrThrow({ where: { hoi_thoai_id: id, loai_tep: "image" } });
  const preview = await page.request.get(`/media/ai-attachments/${file.id}?preview=1`); expect(preview.status()).toBe(200); expect(preview.headers()["content-type"]).toBe("image/jpeg");
  await page.reload(); await expect(input(page)).toBeEnabled(); await expect(chat(page).getByRole("img", { name: "may-in.png" }).first()).toBeVisible();
  await signAccount(context, fixture.accounts.none);
  expect((await page.request.get(`/media/ai-attachments/${file.id}`)).status()).toBe(404);
  expect((await page.request.get(`/media/ai-attachments/${file.id}?preview=1`)).status()).toBe(404);
});

test("invalid files show actionable errors; staged upload survives reload and can be removed", async ({ page }) => {
  const before = await db.tep_dinh_kem_ai.count({ where: { account_id: fixture.accounts.manager.id } });
  await input(page).fill("Giữ câu đang nhập");
  await chat(page).getByLabel("Chọn tệp đính kèm").setInputFiles({ name: "fake.png", buffer: Buffer.from("not an image"), mimeType: "image/png" });
  await expect(chat(page).getByRole("alert")).toContainText("Ảnh không hợp lệ"); await expect(input(page)).toHaveValue("Giữ câu đang nhập");
  expect(await db.tep_dinh_kem_ai.count({ where: { account_id: fixture.accounts.manager.id } })).toBe(before);
  await upload(page, "pending.csv", Buffer.from("Phòng,Giá\nIT,10\n"));
  const file = await db.tep_dinh_kem_ai.findFirstOrThrow({ where: { account_id: fixture.accounts.manager.id, ten_tep: "pending.csv" } });
  await page.reload(); await expect(input(page)).toBeEnabled();
  await chat(page).getByText(/Tệp chưa gửi \(/).click();
  const pending = chat(page).locator("details").getByText("pending.csv", { exact: true }).locator("..");
  await pending.getByRole("button", { name: "Đính kèm", exact: true }).click();
  await chat(page).getByRole("button", { name: "Bỏ tệp pending.csv", exact: true }).click();
  await expect(chat(page).getByRole("button", { name: "Bỏ tệp pending.csv", exact: true })).toHaveCount(0);
  expect(await db.tep_dinh_kem_ai.findUnique({ where: { id: file.id } })).toBeNull();
  expect((await page.request.get(`/media/ai-attachments/${file.id}`)).status()).toBe(404);
});

test("send retry reuses the same attachment and request; foreign pending file is rejected", async ({ page }) => {
  const filename = `retry-${crypto.randomUUID()}.csv`;
  await upload(page, filename, Buffer.from("Phòng,Giá\nIT,10\n"));
  const own = await db.tep_dinh_kem_ai.findFirstOrThrow({ where: { account_id: fixture.accounts.manager.id, ten_tep: filename } });
  const foreign = await db.tep_dinh_kem_ai.create({ data: { company_id: fixture.companyId, account_id: fixture.accounts.none.id, ma_tai_len: crypto.randomUUID(), khoa_luu_tru: crypto.randomUUID(), ten_tep: "foreign.csv", loai_tep: "csv", dung_luong: 3, tom_tat: { note: "test" } } });
  let tampered = false;
  await page.route("**/*", async route => {
    const req = route.request(), body = req.postData() ?? "";
    if (!tampered && req.method() === "POST" && body.includes('"attachmentIds":')) { tampered = true; return route.continue({ postData: body.replace(`"attachmentIds":[${own.id}]`, `"attachmentIds":[${foreign.id}]`) }); }
    return route.continue();
  });
  await input(page).fill("TEST_FILES SHEET"); await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page).getByRole("alert")).toContainText("không thuộc tài khoản");
  expect((await db.tep_dinh_kem_ai.findUniqueOrThrow({ where: { id: own.id } })).tin_nhan_id).toBeNull();
  await page.unrouteAll({ behavior: "wait" });
  let aborted = false;
  await page.route("**/*", async route => {
    const body = route.request().postData() ?? "";
    if (!aborted && route.request().method() === "POST" && body.includes('"attachmentIds":')) {
      aborted = true; await route.fetch(); return route.abort("failed");
    }
    return route.continue();
  });
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(chat(page).getByRole("alert")).toContainText("Mất kết nối");
  const costBefore = await db.nhat_ky_goi_ai.count({ where: { account_id: fixture.accounts.manager.id } });
  await chat(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click(); await expect(input(page)).toHaveValue("");
  expect(await db.nhat_ky_goi_ai.count({ where: { account_id: fixture.accounts.manager.id } })).toBe(costBefore);
  expect(await db.tep_dinh_kem_ai.count({ where: { account_id: fixture.accounts.manager.id, ten_tep: filename } })).toBe(1);
  await db.tep_dinh_kem_ai.delete({ where: { id: foreign.id } });
});

test("drop and paste attach files, enforce selection limits and preserve composer", async ({ page }) => {
  await input(page).fill("Phân tích các tệp này");
  await input(page).evaluate(el => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["Tên,Giá\nA,10"], "drop-a.csv", { type: "text/csv" }));
    transfer.items.add(new File(["Tên,Giá\nB,20"], "drop-b.csv", { type: "text/csv" }));
    el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(chat(page).getByRole("button", { name: "Bỏ tệp drop-b.csv", exact: true })).toBeEnabled({ timeout: 25000 });
  const bytes = [...await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).png().toBuffer()];
  await input(page).evaluate((el, data) => {
    const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(data)], "pasted.png", { type: "image/png" }));
    el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  }, bytes);
  await expect(chat(page).getByRole("button", { name: "Bỏ tệp pasted.png", exact: true })).toBeEnabled({ timeout: 25000 });
  await input(page).evaluate(el => { const transfer = new DataTransfer(); transfer.items.add(new File(["a,b"], "fourth.csv")); el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer })); });
  await expect(chat(page).getByRole("alert")).toContainText("3 tệp");
  await expect(input(page)).toHaveValue("Phân tích các tệp này");
  for (const name of ["drop-a.csv", "drop-b.csv", "pasted.png"]) { await chat(page).getByRole("button", { name: `Bỏ tệp ${name}`, exact: true }).click(); await expect(chat(page).getByRole("button", { name: `Bỏ tệp ${name}`, exact: true })).toHaveCount(0); }
  await chat(page).getByLabel("Chọn tệp đính kèm").setInputFiles({ name: "large.csv", buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 65), mimeType: "text/csv" });
  await expect(chat(page).getByRole("alert")).toContainText("10 MiB");
  expect(await db.tep_dinh_kem_ai.count({ where: { account_id: fixture.accounts.manager.id, ten_tep: { in: ["drop-a.csv", "drop-b.csv", "pasted.png", "fourth.csv", "large.csv"] } } })).toBe(0);
});
