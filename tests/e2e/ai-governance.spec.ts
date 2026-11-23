import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { signAccount } from "../helpers/account-fixture";

test.skip(!process.env.AI_GOVERNANCE_UI_FIXTURE || !/^\/sdg_ai_governance_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? "postgresql://localhost/none").pathname), "Disposable database/mock provider only");
test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);
const db = new PrismaClient();
const fixture = process.env.AI_GOVERNANCE_UI_FIXTURE ? JSON.parse(readFileSync(process.env.AI_GOVERNANCE_UI_FIXTURE, "utf8")) : { accounts: { manager: {} } };
const manager = fixture.accounts.manager;
const area = (page: Page) => page.getByRole("region", { name: "Trợ lý AI", exact: true });
async function send(page: Page, message: string) {
  await area(page).getByRole("textbox", { name: "Yêu cầu AI", exact: true }).fill(message);
  await area(page).getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(area(page).getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeEnabled();
}
test.afterAll(async () => db.$disconnect());

test("connection policy and job dropdown save exact source/model with versioned prices", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/settings/ai");
  const card = page.getByRole("article", { name: "Kết nối chính", exact: true });
  await card.getByRole("button", { name: "Ngân sách & đơn giá" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Ngân sách kết nối (USD/tháng)" }).fill("");
  await dialog.getByRole("button", { name: "Lưu ngân sách kết nối" }).click(); await expect(dialog).toHaveCount(0);
  expect((await db.ket_noi_ai.findUniqueOrThrow({ where: { id: fixture.connectionIds[0] } })).han_muc_chi_phi_thang).toBeNull();
  await page.getByRole("tab", { name: "Theo tác vụ" }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Tra cứu dữ liệu", exact: true }) }).getByRole("button", { name: "Cấu hình tác vụ" }).click();
  await dialog.getByRole("combobox", { name: "Kết nối tác vụ", exact: true }).click(); await page.getByRole("option", { name: "Kết nối tra cứu", exact: true }).click();
  await dialog.getByRole("button", { name: "Tải model của kết nối" }).click();
  await expect(dialog.getByRole("button", { name: "Lưu cấu hình tác vụ" })).toBeEnabled();
  await dialog.getByRole("combobox", { name: "Model tác vụ", exact: true }).click(); await page.getByRole("option", { name: "lookup-model", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Cấu hình đơn giá model riêng" }).check();
  await dialog.getByRole("textbox", { name: "Đầu vào", exact: true }).fill("1");
  await dialog.getByRole("textbox", { name: "Đầu vào cache", exact: true }).fill("0.5");
  await dialog.getByRole("textbox", { name: "Đầu ra", exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Lưu cấu hình tác vụ" }).click(); await expect(dialog).toHaveCount(0);
  const job = await db.cau_hinh_tac_vu_ai.findUniqueOrThrow({ where: { company_id_ma_tac_vu: { company_id: manager.company_id, ma_tac_vu: "LOOKUP" } } });
  expect(job.ket_noi_ai_id).toBe(fixture.connectionIds[1]); expect(job.model).toBe("lookup-model");
});

test("account limit blank is persisted as unlimited; chat routes job, restores history and records usage", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/settings/ai"); await page.getByRole("tab", { name: "Hạn mức tài khoản" }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Thử manager", exact: true }) }).getByRole("button", { name: "Sửa hạn mức" }).click();
  const dialog = page.getByRole("dialog"); await dialog.getByRole("textbox", { name: "Hạn mức tài khoản (USD/tháng)" }).fill("");
  await dialog.getByRole("button", { name: "Lưu hạn mức", exact: true }).click(); await expect(dialog).toHaveCount(0);
  expect((await db.tai_khoan.findUniqueOrThrow({ where: { id: manager.id } })).han_muc_ai_thang).toBeNull();
  await page.goto("/?aiChat=new"); await expect(area(page)).toContainText("Không giới hạn");
  await area(page).getByRole("combobox", { name: "Tác vụ AI", exact: true }).click(); await page.getByRole("option", { name: "Tra cứu dữ liệu", exact: true }).click();
  await send(page, "Tra cứu thử kết nối theo công việc");
  await expect(area(page).getByRole("log")).toContainText("lookup-model");
  await page.reload(); await expect(area(page).getByRole("log")).toContainText("lookup-model");
  const row = await db.nhat_ky_goi_ai.findFirstOrThrow({ where: { account_id: manager.id }, orderBy: { id: "desc" } }); expect(row.ket_noi_ai_id).toBe(fixture.connectionIds[1]); expect(row.trang_thai).toBe("HOAN_TAT");
  await page.goto("/settings/ai"); await page.getByRole("tab", { name: "Mức sử dụng" }).click();
  await expect(page.getByRole("table", { name: "Nhật ký gọi AI" })).toContainText("lookup-model");
  await expect(page.getByText("Đối soát OpenAI: chưa kết nối", { exact: true })).toBeVisible();
  await page.screenshot({ path: "outputs/ai-governance/usage-desktop.png", fullPage: true });
});

test("zero budget blocks before provider and clearing it restores calls; existing work approval still works", async ({ page, context }) => {
  await signAccount(context, manager);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: 0 } });
  const before = await db.nhat_ky_goi_ai.count({ where: { account_id: manager.id } });
  await page.goto("/?aiChat=new"); await send(page, "Yêu cầu khi mức bằng không");
  await expect(area(page).getByRole("alert")).toContainText("Hạn mức AI tháng");
  expect(await db.nhat_ky_goi_ai.count({ where: { account_id: manager.id } })).toBe(before);
  await db.tai_khoan.update({ where: { id: manager.id }, data: { han_muc_ai_thang: null } });
  await db.loai_tai_san.updateMany({ where: { company_id: manager.company_id }, data: { khau_hao_mac_dinh_thang: 36 } });
  await page.goto("/?aiChat=new"); await send(page, "Đặt khấu hao mặc định tất cả loại tài sản 60 tháng");
  await expect(area(page).getByRole("button", { name: /Duyệt và thực hiện/ })).toBeVisible();
  await area(page).getByRole("button", { name: /Duyệt và thực hiện/ }).click();
  await expect.poll(async () => (await db.cong_viec_ai.findFirstOrThrow({ where: { account_id: manager.id }, orderBy: { id: "desc" } })).trang_thai).toBe("HOAN_TAT");
});

test("independent grants expose only the permitted settings tabs; no grant denies direct page", async ({ page, context }) => {
  for (const [kind, yes, no] of [["limits", "Hạn mức tài khoản", "Kết nối & model"], ["usage", "Mức sử dụng", "Hạn mức tài khoản"], ["connections", "Kết nối & model", "Mức sử dụng"]]) {
    await signAccount(context, fixture.accounts[kind]); await page.goto("/settings/ai");
    await expect(page.getByRole("tab", { name: yes, exact: true })).toBeVisible(); await expect(page.getByRole("tab", { name: no, exact: true })).toHaveCount(0);
  }
  await signAccount(context, fixture.accounts.none); await page.goto("/settings/ai"); await expect(page.getByRole("heading", { name: "Chưa có quyền truy cập cài đặt" })).toBeVisible();
});

test("mobile light and dark layouts stay within viewport and retain readable settings", async ({ page, context }) => {
  await signAccount(context, manager); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/settings/ai");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { document.documentElement.classList.toggle("dark", theme === "dark"); }, theme);
    await expect(page.getByRole("tab", { name: "Theo tác vụ" })).toBeVisible();
    const tabsBox = await page.getByRole("tablist").boundingBox(), panelBox = await page.getByRole("tabpanel").boundingBox();
    expect(tabsBox!.y + tabsBox!.height).toBeLessThanOrEqual(panelBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `outputs/ai-governance/settings-mobile-${theme}.png`, fullPage: true });
  }
  await page.getByRole("tab", { name: "Mức sử dụng" }).click(); await expect(page.getByRole("table", { name: "Nhật ký gọi AI" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "outputs/ai-governance/usage-mobile-dark.png", fullPage: true });
});
