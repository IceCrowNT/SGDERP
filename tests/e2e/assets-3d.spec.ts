import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
import { chooseRoomPoint } from "../helpers/office-3d";
import { HCNS_URL } from "../../src/lib/office-3d/building-navigation";
const db = new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL ?? ""), "Isolated database required");
test.describe.configure({ mode: "serial" });
test.setTimeout(180000);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, reader: Account, none: Account, company: number, assetId: number, managerRole: number, grantId: number;
let seat1: number, seat2: number, seat6: number, savedRequest: Request;
const name = `PC thử 3D ${randomUUID().slice(0, 8)}`;
const panel = (page: Page) => page.getByRole("region", { name: "Tài sản tại vị trí" });
const asset = () => db.tai_san.findUniqueOrThrow({ where: { id: assetId } });
async function enter(page: Page) {
  await page.goto(HCNS_URL);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({ timeout: 90000 });
}
async function choose(page: Page) {
  await panel(page).getByRole("button", { name: "Gán tài sản", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm tài sản để gán" }).fill(name);
  await page.getByRole("button", { name: `Gán tài sản ${name}`, exact: true }).click();
}
test.beforeAll(async () => {
  const map = JSON.parse(readFileSync("var/office-3d/hcns.json", "utf8"));
  company = map.companyId;
  const seat = (key: string) => map.points.find((p: { key: string }) => p.key === key).locationId;
  seat1 = seat("hcns-01"); seat2 = seat("hcns-02"); seat6 = seat("hcns-06");
  async function account(level: "VIEW" | "MANAGE" | null) {
    const permissions = await db.quyen.findMany({ where: { pham_vi: "ALL", OR: [{ phan_he: "LOCATIONS", hanh_dong: "VIEW" }, ...(level ? [{ phan_he: "ASSETS", hanh_dong: level }] : [])] } });
    const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: `A3D-${randomUUID()}`, ten_vai_tro: "3D assets test", danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
    if (level === "MANAGE") { managerRole = role.id; grantId = permissions.find(p => p.phan_he === "ASSETS")!.id; }
    return db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `a3d-${randomUUID()}`, ten_hien_thi: "3D assets test", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  }
  manager = await account("MANAGE"); reader = await account("VIEW"); none = await account(null);
  const category = await db.loai_tai_san.create({ data: { company_id: company, ma_loai: `PC_${Date.now()}`, ten_loai: "Máy tính để bàn" } });
  assetId = (await db.tai_san.create({ data: { company_id: company, loai_tai_san_id: category.id, ten_tai_san: name, tinh_trang: "BINH_THUONG", ghi_chu: "Giữ nguyên ghi chú" } })).id;
});
test.afterAll(() => db.$disconnect());

test("assign, confirm/cancel transfer, choose equipment point and clear without losing camera or asset fields", async ({ page, context }) => {
  const errors: string[] = []; let documents = 0;
  page.on("pageerror", e => errors.push(e.message)); page.on("request", r => { if (r.resourceType() === "document") documents++; });
  await signAccount(context, manager); await enter(page);
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  const original = await page.locator("canvas").elementHandle();
  const sent = page.waitForRequest(r => Boolean(r.headers()["next-action"]) && (r.postData() ?? "").includes('"assetId"'));
  await choose(page); savedRequest = await sent;
  await expect(panel(page)).toContainText(name); expect((await asset()).vi_tri_id).toBe(seat1);
  await expect(page.getByRole("region", { name: "Nhân sự tại vị trí" })).toHaveCount(0);
  await chooseRoomPoint(page, "Vị trí 02"); await choose(page);
  const confirm = page.getByRole("dialog", { name: "Chuyển vị trí tài sản?", exact: true });
  await expect(confirm).toContainText("Vị trí 01"); await expect(confirm).toContainText("Vị trí 02");
  await confirm.getByRole("button", { name: "Hủy", exact: true }).click(); expect((await asset()).vi_tri_id).toBe(seat1);
  await choose(page); await confirm.getByRole("button", { name: "Xác nhận chuyển tài sản", exact: true }).click();
  await expect(panel(page)).toContainText(name); expect((await asset()).vi_tri_id).toBe(seat2);
  await panel(page).getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "Chuyển tài sản", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm vị trí cho tài sản" }).fill("Vị trí 06");
  await page.getByRole("dialog").getByRole("button", { name: /Vị trí 06/ }).click();
  await page.getByRole("button", { name: "Xác nhận chuyển tài sản", exact: true }).click();
  await expect(panel(page)).not.toContainText(name);
  await chooseRoomPoint(page, "Vị trí 06"); await expect(panel(page)).toContainText(name); expect((await asset()).vi_tri_id).toBe(seat6);
  await panel(page).getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "Bỏ gán tài sản", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận bỏ gán tài sản", exact: true }).click();
  await expect(panel(page)).not.toContainText(name);
  const row = await asset(); expect(row.vi_tri_id).toBeNull(); expect(row.ghi_chu).toBe("Giữ nguyên ghi chú"); expect(row.nguoi_su_dung_id).toBeNull();
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: company, phan_he: "ASSETS", doi_tuong_id: `tai_san:${assetId}` } })).toBe(4);
  expect(await original!.evaluate(el => el.isConnected && el === document.querySelector("canvas"))).toBe(true);
  await expect(page.getByRole("button", { name: "Mặt bằng", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(documents).toBe(1); expect(errors).toEqual([]);
});

test("VIEW is read only, LOCATIONS alone receives no asset list, and direct mutation is denied", async ({ page, context }) => {
  await db.tai_san.update({ where: { id: assetId }, data: { vi_tri_id: seat1 } });
  await signAccount(context, reader); await enter(page);
  await expect(panel(page)).toContainText(name);
  await expect(page.getByRole("button", { name: "Gán tài sản", exact: true })).toHaveCount(0);
  const before = await asset();
  const body = await (await page.request.post("/office-3d", { headers: { "Next-Action": savedRequest.headers()["next-action"], "Content-Type": "text/plain;charset=UTF-8" }, data: JSON.stringify([{ assetId, version: before.updated_at.toISOString(), locationId: null, confirmMove: true }]) })).text();
  expect(body).toContain('"success":false'); expect((await asset()).vi_tri_id).toBe(seat1);
  await signAccount(context, none); await enter(page);
  await expect(panel(page)).toHaveCount(0); expect(await page.content()).not.toContain(name);
});

test("an open picker cannot overwrite newer data or continue after permission revocation", async ({ page, context }) => {
  await signAccount(context, manager); await enter(page); await chooseRoomPoint(page, "Vị trí 02"); await choose(page);
  await db.tai_san.update({ where: { id: assetId }, data: { ghi_chu: "Cập nhật đồng thời" } });
  await page.getByRole("button", { name: "Xác nhận chuyển tài sản", exact: true }).click();
  await expect(panel(page).getByRole("alert")).toContainText("đã thay đổi"); expect((await asset()).vi_tri_id).toBe(seat1);
  await choose(page);
  await db.vai_tro_quyen.delete({ where: { role_id_permission_id: { role_id: managerRole, permission_id: grantId } } });
  try {
    await page.getByRole("button", { name: "Xác nhận chuyển tài sản", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("quyền"); expect((await asset()).vi_tri_id).toBe(seat1);
  } finally { await db.vai_tro_quyen.create({ data: { role_id: managerRole, permission_id: grantId } }); }
});

test("mobile picker, retry, cancel and 3D/assets synchronization", async ({ page, context }) => {
  await signAccount(context, manager); await enter(page);
  await page.screenshot({ path: "outputs/assets-3d/assigned-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseRoomPoint(page, "Vị trí 02");
  await page.route("**/office-3d*", async route => { if (route.request().headers()["next-action"] && (route.request().postData() ?? "").includes('"search"')) await route.abort(); else await route.continue(); });
  await panel(page).getByRole("button", { name: "Gán tài sản", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.unroute("**/office-3d*"); await page.getByRole("dialog").getByRole("button", { name: "Thử lại", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm tài sản để gán" }).fill(name);
  await page.getByRole("button", { name: `Gán tài sản ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chuyển vị trí tài sản?" })).toBeVisible();
  await page.screenshot({ path: "outputs/assets-3d/confirm-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: "Xác nhận chuyển tài sản", exact: true }).click(); await expect(panel(page)).toContainText(name);
  await page.screenshot({ path: "outputs/assets-3d/assigned-mobile.png", fullPage: true });
  await page.goto("/assets");
  await page.getByRole("textbox", { name: /Tìm/ }).first().fill(name);
  await page.getByRole("textbox", { name: "Tìm tài sản", exact: true }).press("Enter");
  await page.getByRole("button", { name: `Mở tài sản ${name}`, exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Chi tiết tài sản", exact: true })).toContainText("Vị trí 02");
});
