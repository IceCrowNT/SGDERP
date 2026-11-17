import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import jsQR from "jsqr";
import { signAccount } from "../helpers/account-fixture";

test.skip(!/^\/sdg_assets_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable asset DB only");
test.describe.configure({ mode: "serial" });
const db = new PrismaClient(), run = randomUUID().slice(0, 8);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number; ten_dang_nhap: string };
let manager: Account, viewer: Account, blocked: Account, forced: Account;
let id: number, foreign: number, code: string;
const password = "QR-fixture-only-2026";
const detail = (page: Page) => page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true });
const path = () => `/assets?asset=${id}`;
async function login(page: Page, account: Account) {
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(account.ten_dang_nhap);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}
async function expand(page: Page) {
  await detail(page).locator("summary").filter({ hasText: "Tem QR" }).click();
  await expect(detail(page).getByRole("img", { name: `Mã QR của tài sản ${code}` })).toBeVisible();
}

test.beforeAll(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `QR ${run}` } });
  const roles: Record<string, number> = {};
  for (const level of ["VIEW", "MANAGE"]) {
    const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "ASSETS", hanh_dong: level, pham_vi: "ALL" } });
    const role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: level, ten_vai_tro: level, danh_sach_quyen: { create: { permission_id: permission.id } } } });
    roles[level] = role.id;
  }
  const hash = await bcrypt.hash(password, 10);
  async function account(level: string, change = false) {
    return db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `qr-${run}-${level.toLowerCase()}-${change}`, ten_hien_thi: "QR tester", mat_khau_bam: hash, bat_buoc_doi_mat_khau: change, ...(roles[level] ? { danh_sach_vai_tro: { create: { role_id: roles[level] } } } : {}) } });
  }
  manager = await account("MANAGE"); viewer = await account("VIEW"); blocked = await account("NONE"); forced = await account("VIEW", true);
  const category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: "QR", ten_loai: "Thiết bị QR" } });
  const row = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Thiết bị QR <script>alert("x")</script>', hinh_thuc_su_dung: "DUNG_CHUNG" } });
  id = row.id; code = row.ma_tai_san;
  foreign = (await db.tai_san.findFirstOrThrow({ where: { company_id: { not: company.id } } })).id;
});
test.afterAll(async () => db.$disconnect());

test("URL follows panel, Back/Forward and reload; PNG decodes to stable link; copy and print", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Xem tất cả", exact: true }).click();
  const trigger = page.getByRole("button", { name: /^Mở tài sản Thiết bị QR/ });
  await trigger.click(); await expect(page).toHaveURL(new RegExp(`asset=${id}$`));
  await expect(detail(page).locator("summary").filter({ hasText: "Tem QR" })).toBeVisible();
  await expect(detail(page).getByRole("button", { name: "Tải QR", exact: true })).toHaveCount(0);
  await page.goBack(); await expect(detail(page)).not.toBeVisible(); await expect(trigger).toBeVisible();
  await page.goForward(); await expect(detail(page)).toBeVisible();
  await page.reload(); await expand(page);
  const link = new URL(path(), page.url()).href;
  await expect(page.getByLabel("Liên kết tài sản", { exact: true })).toHaveValue(link);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải QR", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`QR-${code}.png`);
  const { data, info } = await sharp(await readFile((await download.path())!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(link);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Sao chép liên kết", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await page.evaluate(() => {
    const append = document.body.append.bind(document.body);
    document.body.append = (...nodes) => {
      append(...nodes);
      for (const node of nodes) if (node instanceof HTMLIFrameElement) node.contentWindow!.print = () => node.setAttribute("data-printed", "true");
    };
  });
  await page.getByRole("button", { name: "In tem", exact: true }).click();
  const frame = page.locator('iframe[title="In tem tài sản"]');
  await expect(frame).toHaveAttribute("data-printed", "true");
  await expect(frame.contentFrame().locator("h1")).toHaveText(code);
  await expect(frame.contentFrame().locator("p")).toHaveText('Thiết bị QR <script>alert("x")</script>');
  await expect(frame.contentFrame().locator("script")).toHaveCount(0);
  await detail(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(page).toHaveURL(/\/assets$/);
});

test("direct QR link returns after login and mandatory password change; external redirect rejected", async ({ page, context }) => {
  await page.goto(path()); await expect(page).toHaveURL(/\/login\?returnTo=/);
  await login(page, viewer); await expect(page).toHaveURL(new RegExp(`asset=${id}$`)); await expand(page);
  await expect(detail(page).getByRole("button", { name: "Sửa tên tài sản", exact: true })).toHaveCount(0);
  await context.clearCookies(); await page.goto(path()); await login(page, forced);
  await expect(page).toHaveURL(/\/profile\?returnTo=/);
  await page.getByLabel("Mật khẩu hiện tại", { exact: false }).fill(password);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(`${password}-new`);
  await page.getByLabel("Nhập lại mật khẩu mới", { exact: false }).fill(`${password}-new`);
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`asset=${id}$`)); await expect(detail(page)).toBeVisible();
  await context.clearCookies(); await page.goto("/login?returnTo=https%3A%2F%2Fexample.org");
  await login(page, viewer); await expect(page).toHaveURL(new URL("/", page.url()).href);
});

test("revoked session returns through login; invalid, missing, foreign and unauthorized links reveal no QR", async ({ page, context }) => {
  await signAccount(context, viewer);
  await db.tai_khoan.update({ where: { id: viewer.id }, data: { phien_ban_dang_nhap: { increment: 1 } } });
  await page.goto(path()); await expect(page).toHaveURL(/\/login\?returnTo=/); await login(page, viewer);
  await expect(detail(page)).toBeVisible();
  for (const [value, message] of [["abc", "Liên kết tài sản không hợp lệ."], ["2147483648", "Liên kết tài sản không hợp lệ."], ["2147483647", "Không tìm thấy tài sản."], [String(foreign), "Không tìm thấy tài sản."]]) {
    await page.goto(`/assets?asset=${value}`);
    await expect(detail(page).getByRole("alert")).toContainText(message);
    await expect(detail(page).locator("summary").filter({ hasText: "Tem QR" })).toHaveCount(0);
  }
  await signAccount(context, blocked); await page.goto(path());
  await expect(page.getByText("Không thể truy cập tài sản", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Mã QR/ })).toHaveCount(0);
});

test("create and rename preserve link; edit cancel restores detail", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/assets");
  await page.getByRole("button", { name: "Thêm tài sản", exact: true }).click();
  const create = page.getByRole("dialog", { name: "Thêm tài sản", exact: true });
  await create.getByLabel("Tên tài sản", { exact: false }).fill("QR mới");
  await create.getByRole("combobox", { name: /^Loại tài sản/ }).click();
  await page.getByRole("option", { name: /Thiết bị QR/ }).click();
  await create.getByRole("button", { name: "Lưu tài sản", exact: true }).click();
  await expect(detail(page).getByRole("heading", { name: "QR mới", exact: true })).toBeVisible();
  const url = page.url(); expect(url).toMatch(/\/assets\?asset=\d+$/);
  await detail(page).getByRole("button", { name: "Sửa tên tài sản", exact: true }).click();
  const edit = page.getByRole("form", { name: "Sửa thông tin tài sản", exact: true });
  await edit.getByLabel("Tên tài sản", { exact: false }).fill("QR đổi tên");
  await edit.getByLabel("Tên tài sản", { exact: true }).press("Enter");
  await expect(detail(page).getByRole("heading", { name: "QR đổi tên", exact: true })).toBeVisible();
  await expect(page).toHaveURL(url);
  await detail(page).getByRole("button", { name: "Sửa tên tài sản", exact: true }).click();
  await edit.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(detail(page)).toBeVisible();
  await detail(page).locator("summary").filter({ hasText: "Tem QR" }).click();
  await expect(page.getByLabel("Liên kết tài sản", { exact: true })).toHaveValue(url);
});

test("mobile light/dark, detail network retry and clipboard fallback", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 });
  let fail = true;
  await page.route("**/assets?asset=*", async route => {
    if (route.request().method() === "POST" && fail) { fail = false; await route.abort(); } else await route.continue();
  });
  await page.goto(path()); await expect(detail(page).getByRole("alert")).toContainText("Không tải được hồ sơ");
  await page.getByRole("button", { name: "Tải lại hồ sơ", exact: true }).click(); await expand(page);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true }));
  await page.getByRole("button", { name: "Sao chép liên kết", exact: true }).click();
  await expect(page.getByText("Không thể sao chép tự động. Hãy chọn và sao chép liên kết bên dưới.", { exact: true })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => localStorage.setItem("theme", theme), theme);
    await page.reload(); await expand(page);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(detail(page).locator("summary").filter({ hasText: "Tem QR" })).toHaveCSS("color", theme === "dark" ? "rgb(248, 250, 252)" : "rgb(2, 8, 23)");
    await page.getByLabel("Liên kết tài sản", { exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ animations: "disabled", path: `outputs/assets-qr/mobile-${theme}.png` });
  }
});
