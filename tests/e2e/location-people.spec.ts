import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
test.skip(!process.env.DATABASE_URL?.includes("/sdg_hr_location_test_"), "Requires an isolated restored DB; never mutate the operating data.");
test.describe.configure({ mode: "serial" });
const run = randomUUID().slice(0, 8);
let company: number, department: number, personId: number, foreignId: number;
let one: number, two: number, three: number;
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number; };
let locationOnly: typeof manager, reader: typeof manager;
let assignmentRequest: Request, deletionRequest: Request, previewRequest: Request;
const personName = `Người thử vị trí ${run}`;
const action = (r: Request) => r.method() === "POST" && Boolean(r.headers()["next-action"]);
async function replay(page: Page, request: Request, value: unknown) {
  return (await page.request.post("/locations", { headers: { "Next-Action": request.headers()["next-action"], "Content-Type": request.headers()["content-type"] }, data: JSON.stringify([value]) })).text();
}
async function person() { return db.nhan_su.findUniqueOrThrow({ where: { id: personId } }); }
async function payload(locationId: number | null, confirmMove = false) {
  const row = await person(); return { employeeId: row.id, locationId, version: row.updated_at.toISOString(), confirmMove };
}
async function openLocation(page: Page, name: string) {
  await page.goto("/locations");
  await page.getByRole("button", { name: `Xem vị trí ${name}`, exact: true }).click();
}
async function selectPerson(page: Page) {
  await page.getByRole("button", { name: "Gán nhân sự", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm nhân sự để gán" }).fill(personName);
  await page.getByRole("button", { name: `Gán ${personName}`, exact: true }).click();
}
async function openDelete(page: Page, name: string) {
  await openLocation(page, name);
  const request = page.waitForRequest(action);
  await page.getByRole("button", { name: "Xóa vị trí", exact: true }).click();
  previewRequest = await request;
  return page.getByRole("dialog", { name: "Xóa vị trí?", exact: true });
}
test.beforeAll(async () => {
  company = (await db.cong_ty.create({ data: { ten_cong_ty: `Location people ${run}` } })).id;
  department = (await db.phong_ban.create({ data: { company_id: company, ma_phong_ban: "TEST", ten_phong_ban: "Phòng thử nghiệm" } })).id;
  async function seat(name: string) { return (await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: name, loai_vi_tri: "CHO_NGOI" } })).id; }
  one = await seat("Bàn thử 01"); two = await seat("Bàn thử 02"); three = await seat("Bàn thử 03");
  personId = (await db.nhan_su.create({ data: { company_id: company, department_id: department, ho_ten: personName, tinh_trang_lam_viec: "ACTIVE", so_dien_thoai: "0123456789", chuc_vu: "Thông tin phải giữ nguyên" } })).id;
  async function account(name: string, grants: [string, string][]) {
    const permissions = await Promise.all(grants.map(([phan_he, hanh_dong]) => db.quyen.findFirstOrThrow({ where: { phan_he, hanh_dong, pham_vi: "ALL" } })));
    const role = await db.vai_tro.create({ data: { company_id: company, ma_vai_tro: `${name}-${run}`, ten_vai_tro: name, danh_sach_quyen: { create: permissions.map((p) => ({ permission_id: p.id })) } } });
    return db.tai_khoan.create({ data: { company_id: company, ten_dang_nhap: `${name}-${run}`, ten_hien_thi: name, mat_khau_bam: "disabled", danh_sach_vai_tro: { create: { role_id: role.id } } } });
  }
  manager = await account("location-hr", [["LOCATIONS", "MANAGE"], ["HR", "MANAGE"]]);
  locationOnly = await account("location-only", [["LOCATIONS", "MANAGE"]]);
  reader = await account("location-reader", [["LOCATIONS", "VIEW"], ["HR", "VIEW"]]);
  const foreign = await db.cong_ty.create({ data: { ten_cong_ty: `Foreign ${run}` } });
  foreignId = (await db.vi_tri.create({ data: { company_id: foreign.id, ten_vi_tri: "Foreign private location", loai_vi_tri: "CHO_NGOI" } })).id;
});
test.afterAll(() => db.$disconnect());

test("assign, cancel/confirm transfer and show people without modifying the HR profile", async ({ page, context }) => {
  test.setTimeout(90000);
  await signAccount(context, manager);
  await openLocation(page, "Bàn thử 01");
  const saving = page.waitForRequest((r) => action(r) && (r.postData() ?? "").includes("employeeId"));
  await selectPerson(page); assignmentRequest = await saving;
  await expect.poll(async () => (await person()).vi_tri_lam_viec_id).toBe(one);
  await expect(page.getByRole("region", { name: "Nhân sự tại vị trí" })).toContainText(personName);
  await openLocation(page, "Bàn thử 02"); await selectPerson(page);
  let confirm = page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" });
  await expect(confirm).toContainText("Bàn thử 01"); await expect(confirm).toContainText("Bàn thử 02");
  await confirm.getByRole("button", { name: "Hủy", exact: true }).click(); expect((await person()).vi_tri_lam_viec_id).toBe(one);
  await selectPerson(page); confirm = page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" });
  await confirm.getByRole("button", { name: "Chuyển vị trí", exact: true }).click();
  await expect.poll(async () => (await person()).vi_tri_lam_viec_id).toBe(two);
  await expect(page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" })).toHaveCount(0);
  await page.getByRole("button", { name: "Gán nhân sự", exact: true }).click();
  await expect(page.getByRole("button", { name: `Gán ${personName}`, exact: true })).toBeDisabled();
  expect((await person()).so_dien_thoai).toBe("0123456789"); expect((await person()).chuc_vu).toBe("Thông tin phải giữ nguyên");
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: company, phan_he: "HR", doi_tuong_id: String(personId) } })).toBe(2);
});

test("direct actions enforce HR permissions, confirmation, tenant, active locations and stale versions", async ({ page, context }) => {
  await signAccount(context, manager); await page.goto("/locations");
  expect(await replay(page, assignmentRequest, await payload(three))).toContain("Vui lòng xác nhận chuyển");
  expect(await replay(page, assignmentRequest, await payload(foreignId, true))).toContain("Chọn phòng, khu vực hoặc chỗ ngồi");
  const invalid = await db.vi_tri.create({ data: { company_id: company, ten_vi_tri: "Thiết bị riêng", loai_vi_tri: "DIEM_DAT_THIET_BI" } });
  expect(await replay(page, assignmentRequest, await payload(invalid.id, true))).toContain("Chọn phòng, khu vực hoặc chỗ ngồi");
  await db.vi_tri.update({ where: { id: three }, data: { dang_su_dung: false } });
  expect(await replay(page, assignmentRequest, await payload(three, true))).toContain("Chọn phòng, khu vực hoặc chỗ ngồi");
  await db.vi_tri.update({ where: { id: three }, data: { dang_su_dung: true } });
  expect(await replay(page, assignmentRequest, { ...await payload(one, true), version: "2000-01-01T00:00:00.000Z" })).toContain("Hồ sơ đã thay đổi");
  await signAccount(context, reader); await openLocation(page, "Bàn thử 02");
  await expect(page.getByRole("region", { name: "Nhân sự tại vị trí" })).toContainText(personName);
  await expect(page.getByRole("button", { name: "Gán nhân sự", exact: true })).toHaveCount(0);
  expect(await replay(page, assignmentRequest, await payload(one, true))).toContain("Không có quyền sửa nhân sự");
  await signAccount(context, locationOnly); await openLocation(page, "Bàn thử 02");
  await expect(page.getByRole("region", { name: "Nhân sự tại vị trí" })).toHaveCount(0);
  await expect(page.getByText(personName, { exact: true })).toHaveCount(0);
  const dialog = await openDelete(page, "Bàn thử 02");
  await expect(dialog).toContainText("Cần thêm quyền quản lý nhân sự");
  await expect(dialog.getByRole("button", { name: "Xác nhận xóa" })).toBeDisabled();
  expect((await person()).vi_tri_lam_viec_id).toBe(two);
});

test("stale transfer refreshes the person; move and clear work directly from the location panel", async ({ page, context }) => {
  await signAccount(context, manager); await openLocation(page, "Bàn thử 01"); await selectPerson(page);
  await db.nhan_su.update({ where: { id: personId }, data: { vi_tri_lam_viec_id: three } });
  await page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" }).getByRole("button", { name: "Chuyển vị trí", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Hồ sơ đã thay đổi"); expect((await person()).vi_tri_lam_viec_id).toBe(three);
  await selectPerson(page); const confirm = page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" });
  await expect(confirm).toContainText("Bàn thử 03"); await confirm.getByRole("button", { name: "Chuyển vị trí", exact: true }).click();
  await expect.poll(async () => (await person()).vi_tri_lam_viec_id).toBe(one);
  await expect(confirm).toHaveCount(0);
  await page.getByRole("button", { name: "Chuyển vị trí", exact: true }).click();
  await page.getByRole("dialog", { name: "Chọn vị trí mới" }).getByRole("button", { name: "Bàn thử 02", exact: true }).click();
  await page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" }).getByRole("button", { name: "Chuyển vị trí", exact: true }).click();
  await expect.poll(async () => (await person()).vi_tri_lam_viec_id).toBe(two);
  await openLocation(page, "Bàn thử 02"); await page.getByRole("button", { name: "Bỏ gán", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận bỏ gán", exact: true }).click();
  await expect.poll(async () => (await person()).vi_tri_lam_viec_id).toBeNull();
});

test("deletion reconfirms changed membership, then clears active and departed people atomically", async ({ page, context }) => {
  await db.nhan_su.update({ where: { id: personId }, data: { vi_tri_lam_viec_id: two } });
  const retired = await db.nhan_su.create({ data: { company_id: company, department_id: department, ho_ten: "Người nghỉ việc thử", tinh_trang_lam_viec: "ACTIVE", vi_tri_lam_viec_id: two } });
  await db.nhan_su.update({ where: { id: retired.id }, data: { tinh_trang_lam_viec: "LEFT" } });
  await signAccount(context, manager); const dialog = await openDelete(page, "Bàn thử 02");
  await expect(dialog).toContainText("2 nhân sự");
  const late = await db.nhan_su.create({ data: { company_id: company, department_id: department, ho_ten: "Người mới được gán", tinh_trang_lam_viec: "ACTIVE", vi_tri_lam_viec_id: two } });
  const request = page.waitForRequest((r) => action(r) && (r.postData() ?? "").includes("assignmentVersion"));
  await dialog.getByRole("button", { name: "Xác nhận xóa" }).click(); deletionRequest = await request;
  await expect(dialog).toContainText("Danh sách nhân sự đã thay đổi"); await expect(dialog).toContainText("3 nhân sự");
  expect(await db.vi_tri.findUnique({ where: { id: two } })).not.toBeNull();
  await dialog.getByRole("button", { name: "Xác nhận xóa" }).click(); await expect(dialog).toHaveCount(0);
  expect(await db.vi_tri.findUnique({ where: { id: two } })).toBeNull();
  const rows = await db.nhan_su.findMany({ where: { id: { in: [personId, retired.id, late.id] } } });
  expect(rows).toHaveLength(3); expect(rows.every((p) => p.vi_tri_lam_viec_id === null)).toBe(true);
  expect(rows.find((p) => p.id === retired.id)?.tinh_trang_lam_viec).toBe("LEFT");
  expect(await db.nhat_ky_hoat_dong.count({ where: { company_id: company, phan_he: "HR", mo_ta: { startsWith: "Đưa về chưa xác định vị trí do xóa" } } })).toBe(3);
});

test("audit failure rolls back deletion and person changes; concurrent assignment never disappears silently", async ({ page, context }) => {
  await signAccount(context, manager); await openLocation(page, "Bàn thử 01");
  await db.nhan_su.update({ where: { id: personId }, data: { vi_tri_lam_viec_id: one } });
  const dialog = await openDelete(page, "Bàn thử 01"); await expect(dialog).toContainText("1 nhân sự");
  await db.$executeRawUnsafe(`CREATE FUNCTION test_location_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${company} AND NEW.phan_he = 'HR' THEN RAISE EXCEPTION 'test audit rollback'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER test_location_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION test_location_audit_failure()`);
  try {
    await dialog.getByRole("button", { name: "Xác nhận xóa" }).click(); await expect(dialog.getByRole("alert")).toBeVisible();
    expect((await person()).vi_tri_lam_viec_id).toBe(one); expect(await db.vi_tri.findUnique({ where: { id: one } })).not.toBeNull();
    expect(await replay(page, assignmentRequest, await payload(three, true))).toContain("Không thể cập nhật");
    expect((await person()).vi_tri_lam_viec_id).toBe(one);
  } finally { await db.$executeRawUnsafe("DROP TRIGGER test_location_audit_failure ON nhat_ky_hoat_dong"); await db.$executeRawUnsafe("DROP FUNCTION test_location_audit_failure()"); }
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  const target = await db.vi_tri.findUniqueOrThrow({ where: { id: three } });
  const emptyVersion = (await import("node:crypto")).createHash("sha256").update("[]").digest("hex");
  const results = await Promise.all([
    replay(page, assignmentRequest, await payload(three, true)),
    replay(page, deletionRequest, { id: three, version: target.updated_at.toISOString(), assignmentVersion: emptyVersion }),
  ]);
  expect(results.some((s) => s.includes('"success":false'))).toBe(true);
  const finalPerson = await person(), finalTarget = await db.vi_tri.findUnique({ where: { id: three } });
  if (finalTarget) expect(finalPerson.vi_tri_lam_viec_id).toBe(three);
  else expect(finalPerson.vi_tri_lam_viec_id).toBe(one);
  expect(await replay(page, previewRequest, foreignId)).not.toContain("Foreign private location");
});
