import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
const mapping = JSON.parse(readFileSync("var/office-3d/hcns.json", "utf8"));
const base = "/office-3d?floor=2&room=t2_hcns_pc&mode=room";
const run = randomUUID().slice(0, 8);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, viewer: Account, foreign: Account;
let pointId: number, objectId: number, foreignId: number;
const dialog = (page: Page) => page.getByRole("dialog", { name: "Sửa thông tin vị trí", exact: true });
const isAction = (request: Request) => request.method() === "POST" && Boolean(request.headers()["next-action"]);
async function replay(page: Page, request: Request, value: unknown) {
  return (await page.request.post(new URL(request.url()).pathname, {
    headers: { "Next-Action": request.headers()["next-action"], "Content-Type": request.headers()["content-type"] },
    data: JSON.stringify([value]),
  })).text();
}
test.beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.includes("_test_")) throw Error("Isolated test DB required");
  async function account(company: number, level: "VIEW" | "MANAGE") {
    const permission = await db.quyen.findFirstOrThrow({ where: { phan_he: "LOCATIONS", hanh_dong: level, pham_vi: "ALL" } });
    const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: `INLINE-${company}-${level}-${run}`, ten_vai_tro: "Kiểm thử sửa vị trí", danh_sach_quyen: { create: { permission_id: permission.id } } } });
    return db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `inline-${company}-${level}-${run}`, ten_hien_thi: "Kiểm thử vị trí", mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  }
  manager = await account(mapping.companyId, "MANAGE");
  viewer = await account(mapping.companyId, "VIEW");
  const other = await db.cong_ty.create({ data: { ten_cong_ty: `Inline khác ${run}` } });
  foreign = await account(other.id, "MANAGE");
  foreignId = (await db.vi_tri.create({ data: { company_id: other.id, ten_vi_tri: "Không được tiết lộ", loai_vi_tri: "KHU_VUC" } })).id;
  const object = await db.vat_the_3d.findFirstOrThrow({ where: { phong_id: mapping.roomId, company_id: mapping.companyId } });
  pointId = object.vi_tri_id; objectId = object.id;
});
test.afterAll(() => db.$disconnect());
async function open(page: Page, context: Parameters<typeof signAccount>[0], suffix = `&point=object-${objectId}`, account = manager) {
  await signAccount(context, account);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + suffix);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Sửa thông tin vị trí", exact: true }).click();
  await expect(dialog(page).getByLabel("Tên vị trí", { exact: false })).toBeVisible();
}

test("inline edit validates, cancels and saves added, fixed and room locations on the same Canvas", async ({ page, context }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await open(page, context);
  const name = dialog(page).getByLabel("Tên vị trí", { exact: false });
  const before = await db.vi_tri.findUniqueOrThrow({ where: { id: pointId } });
  await expect(dialog(page).getByLabel("Loại vị trí", { exact: false })).toHaveCount(0);
  await expect(dialog(page).getByText("Mã vị trí:", { exact: false })).toHaveCount(0);
  await name.fill("   ");
  await dialog(page).getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(dialog(page).getByText("Nhập tên vị trí", { exact: true })).toBeVisible();
  await name.fill("Bản nháp không lưu");
  await dialog(page).getByRole("button", { name: "Hủy", exact: true }).click();
  expect(await db.vi_tri.findUnique({ where: { id: pointId } })).toEqual(before);
  const canvas = page.locator("canvas"); const original = await canvas.elementHandle();
  const url = page.url();
  for (const [id, suffix] of [[pointId, `&point=object-${objectId}`], [mapping.points[0].locationId, "&point=hcns-01"], [mapping.roomId, ""]] as const) {
    if (suffix !== `&point=object-${objectId}`) {
      await page.getByRole("button", { name: "Tổng quan phòng HCNS", exact: true }).click();
      if (suffix) {
        await page.locator("summary").filter({ hasText: "Danh sách vị trí" }).click();
        const current = await db.vi_tri.findUniqueOrThrow({ where: { id } });
        await page.getByRole("button", { name: `Chọn ${current.ten_vi_tri}`, exact: true }).click();
      }
    }
    const old = await db.vi_tri.findUniqueOrThrow({ where: { id } });
    await page.waitForTimeout(800);
    const picture = await canvas.screenshot();
    const currentUrl = page.url();
    await page.getByRole("button", { name: "Sửa thông tin vị trí", exact: true }).click();
    await dialog(page).getByLabel("Tên vị trí", { exact: false }).fill(`${old.ten_vi_tri} thử ${run}`);
    await dialog(page).getByLabel("Mô tả / hướng dẫn tìm").fill(`Ghi chú sửa trực tiếp ${run}`);
    await dialog(page).getByRole("button", { name: "Lưu vị trí", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.locator("#building-information")).toContainText(`${old.ten_vi_tri} thử ${run}`);
    const after = await db.vi_tri.findUniqueOrThrow({ where: { id } });
    expect(after).toMatchObject({ parent_id: old.parent_id, loai_vi_tri: old.loai_vi_tri, ma_vi_tri: old.ma_vi_tri, dang_su_dung: old.dang_su_dung, mo_ta: `Ghi chú sửa trực tiếp ${run}` });
    expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: manager.company_id, account_id: manager.id, phan_he: "LOCATIONS", doi_tuong_id: `vi_tri:${id}`, hanh_dong: "UPDATE" } })).toBeGreaterThan(0);
    expect(page.url()).toBe(currentUrl);
    expect(await original!.evaluate(el => el === document.querySelector("canvas"))).toBe(true);
    const a = await sharp(picture).raw().toBuffer();
    const b = await sharp(await canvas.screenshot()).raw().toBuffer();
    expect(b.length).toBe(a.length);
    expect(a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length).toBeLessThan(1);
  }
  expect(url).toContain(`object-${objectId}`);
  expect(errors).toEqual([]);
  // Shared full form is still available in the location catalog.
  await page.goto("/locations");
  await page.getByRole("button", { name: "Thêm vị trí", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Loại vị trí", { exact: false })).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Trạng thái", { exact: false })).toBeVisible();
});

test("inline editor keeps stale drafts, enforces permissions and company on server", async ({ page, context }) => {
  let readRequest: Request | undefined, saveRequest: Request | undefined;
  page.on("request", r => { if (!isAction(r)) return; if (r.postData() === `[${pointId}]`) readRequest = r; if (r.postData()?.includes('"description"')) saveRequest = r; });
  await open(page, context);
  const old = await db.vi_tri.findUniqueOrThrow({ where: { id: pointId } });
  const input = { id: old.id, version: old.updated_at.toISOString(), name: old.ten_vi_tri, description: old.mo_ta ?? "", type: old.loai_vi_tri, active: old.dang_su_dung, parentId: old.parent_id };
  await dialog(page).getByLabel("Tên vị trí", { exact: false }).fill("Bản nháp phải giữ");
  await db.vi_tri.update({ where: { id: pointId }, data: { mo_ta: "Cập nhật đồng thời", updated_at: new Date(Date.now() + 1000) } });
  await dialog(page).getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("Vị trí đã thay đổi");
  await expect(dialog(page).getByLabel("Tên vị trí", { exact: false })).toHaveValue("Bản nháp phải giữ");
  const stable = await db.vi_tri.findUniqueOrThrow({ where: { id: pointId } });
  expect(stable.ten_vi_tri).toBe(old.ten_vi_tri);
  expect(readRequest).toBeTruthy(); expect(saveRequest).toBeTruthy();
  expect(await replay(page, readRequest!, foreignId)).toContain("Vị trí không tồn tại");
  await signAccount(context, viewer);
  expect(await replay(page, readRequest!, pointId)).toContain("không có quyền quản lý vị trí");
  expect(await replay(page, saveRequest!, input)).toContain("không có quyền quản lý vị trí");
  await page.goto(base + `&point=object-${objectId}`);
  await expect(page.getByRole("heading", { name: old.ten_vi_tri, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sửa thông tin vị trí", exact: true })).toHaveCount(0);
  await signAccount(context, foreign);
  expect(await replay(page, readRequest!, pointId)).toContain("Vị trí không tồn tại");
  expect(await replay(page, saveRequest!, input)).toContain("Vị trí không tồn tại");
  expect(await db.vi_tri.findUnique({ where: { id: pointId } })).toEqual(stable);
});

test("inline location dialog works expanded and mobile without exiting workspace", async ({ page, context }) => {
  await open(page, context);
  await dialog(page).getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Mở rộng không gian 3D", exact: true }).click();
  await page.getByRole("button", { name: "Sửa thông tin vị trí", exact: true }).click();
  await dialog(page).getByLabel("Mô tả / hướng dẫn tìm").fill("Thử trong khung mở rộng");
  await page.screenshot({ path: "outputs/location-inline/expanded.png" });
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thu gọn không gian 3D", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thu gọn không gian 3D", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator("#building-information").isHidden()) await page.getByRole("button", { name: "Hiện bảng thông tin", exact: true }).click();
  await page.getByRole("button", { name: "Sửa thông tin vị trí", exact: true }).click();
  await dialog(page).getByLabel("Mô tả / hướng dẫn tìm").fill("Ghi chú từ điện thoại");
  await page.screenshot({ path: "outputs/location-inline/mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog(page).getByRole("button", { name: "Lưu vị trí", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect((await db.vi_tri.findUniqueOrThrow({ where: { id: pointId } })).mo_ta).toBe("Ghi chú từ điện thoại");
});
