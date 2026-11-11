import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
test.skip(
  !process.env.DATABASE_URL?.includes("/sdg_hr_location_test_"),
  "Requires an isolated database.",
);
test.describe.configure({ mode: "serial" });
test.setTimeout(180000);
type Account = { id: number; company_id: number; phien_ban_dang_nhap: number };
let manager: Account, reader: Account, locationsOnly: Account, foreign: Account;
let company: number,
  personId: number,
  seat1: number,
  seat2: number,
  request: Request;
const name = `Nhân sự gán 3D ${randomUUID().slice(0, 7)}`;
const person = () => db.nhan_su.findUniqueOrThrow({ where: { id: personId } });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Nhân sự tại vị trí" });
async function choose(page: Page) {
  await page.getByRole("button", { name: "Gán nhân sự", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm nhân sự để gán" }).fill(name);
  await page.getByRole("button", { name: `Gán ${name}`, exact: true }).click();
}
async function replay(page: Page, payload: unknown) {
  return page.evaluate(
    async ({ id, payload }) => {
      const response = await fetch(location.pathname, {
        method: "POST",
        headers: {
          "Next-Action": id,
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: JSON.stringify([payload]),
      });
      return response.text();
    },
    { id: request.headers()["next-action"], payload },
  );
}
test.beforeAll(async () => {
  const mapping = JSON.parse(await readFile("var/office-3d/hcns.json", "utf8"));
  company = mapping.companyId;
  seat1 = mapping.points.find(
    (p: { key: string }) => p.key === "hcns-01",
  ).locationId;
  seat2 = mapping.points.find(
    (p: { key: string }) => p.key === "hcns-02",
  ).locationId;
  const department = await db.phong_ban.findFirstOrThrow({
    where: { company_id: company },
  });
  personId = (
    await db.nhan_su.create({
      data: {
        company_id: company,
        department_id: department.id,
        ho_ten: name,
        tinh_trang_lam_viec: "ACTIVE",
        chuc_vu: "Giữ nguyên chức vụ",
        so_dien_thoai: "0123456789",
      },
    })
  ).id;
  async function account(hr: "VIEW" | "MANAGE" | null, tenant = company) {
    const permissions = await db.quyen.findMany({
      where: {
        pham_vi: "ALL",
        OR: [
          { phan_he: "LOCATIONS", hanh_dong: "VIEW" },
          ...(hr ? [{ phan_he: "HR", hanh_dong: hr }] : []),
        ],
      },
    });
    const role = await db.vai_tro.create({
      data: {
        company_id: tenant,
        ma_vai_tro: `HCNS-${randomUUID()}`,
        ten_vai_tro: "3D assignment test",
        danh_sach_quyen: {
          create: permissions.map((p) => ({ permission_id: p.id })),
        },
      },
    });
    return db.tai_khoan.create({
      data: {
        company_id: tenant,
        ten_dang_nhap: `hcns-${randomUUID()}`,
        ten_hien_thi: "3D test",
        mat_khau_bam: "disabled",
        danh_sach_vai_tro: { create: { role_id: role.id } },
      },
    });
  }
  manager = await account("MANAGE");
  reader = await account("VIEW");
  locationsOnly = await account(null);
  const other = await db.cong_ty.create({
    data: { ten_cong_ty: "HCNS foreign test" },
  });
  foreign = await account("MANAGE", other.id);
});
test.afterAll(() => db.$disconnect());

test("assign, confirm transfer and clear directly in 3D; refresh keeps selection and audit", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signAccount(context, manager);
  await page.goto("/office-3d/hcns");
  await expect(page.locator("canvas[data-room-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  const sent = page.waitForRequest(
    (r) =>
      Boolean(r.headers()["next-action"]) &&
      (r.postData() ?? "").includes("employeeId"),
  );
  await choose(page);
  request = await sent;
  await expect(panel(page)).toContainText(name);
  expect((await person()).vi_tri_lam_viec_id).toBe(seat1);
  await expect(page).toHaveURL(/\/office-3d\/hcns$/);
  await expect(
    page.getByRole("button", { name: "Mặt bằng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Trên mô hình: Vị trí 02", exact: true })
    .click();
  await choose(page);
  const confirm = page.getByRole("dialog", { name: "Chuyển vị trí nhân sự?" });
  await expect(confirm).toContainText("Vị trí 01");
  await expect(confirm).toContainText("Vị trí 02");
  await confirm.getByRole("button", { name: "Hủy", exact: true }).click();
  expect((await person()).vi_tri_lam_viec_id).toBe(seat1);
  await choose(page);
  await confirm
    .getByRole("button", { name: "Chuyển vị trí", exact: true })
    .click();
  await expect(panel(page)).toContainText(name);
  expect((await person()).vi_tri_lam_viec_id).toBe(seat2);
  await expect(
    page.getByRole("button", { name: "Chọn Vị trí 02", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Gán nhân sự", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Gán ${name}`, exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "outputs/hcns-assignment/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Gán nhân sự", exact: true }).click();
  await page.getByRole("textbox", { name: "Tìm nhân sự để gán" }).fill(name);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: "outputs/hcns-assignment/mobile-picker.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  const card = panel(page).getByRole("listitem").filter({ hasText: name });
  await card.getByRole("button", { name: "Bỏ gán", exact: true }).click();
  await page
    .getByRole("button", { name: "Xác nhận bỏ gán", exact: true })
    .click();
  await expect(panel(page)).not.toContainText(name);
  const saved = await person();
  expect(saved.vi_tri_lam_viec_id).toBeNull();
  expect(saved.chuc_vu).toBe("Giữ nguyên chức vụ");
  expect(saved.so_dien_thoai).toBe("0123456789");
  expect(
    await db.nhat_ky_hoat_dong.count({
      where: {
        company_id: company,
        phan_he: "HR",
        doi_tuong_id: String(personId),
      },
    }),
  ).toBe(3);
  expect(errors).toEqual([]);
});

test("3D and location panel share assignments; stale forms cannot overwrite a move", async ({
  page,
  context,
}) => {
  await db.nhan_su.update({
    where: { id: personId },
    data: { vi_tri_lam_viec_id: seat1 },
  });
  await signAccount(context, manager);
  await page.goto("/office-3d/hcns");
  await page
    .getByRole("button", { name: "Chọn Vị trí 02", exact: true })
    .click();
  await choose(page);
  await db.nhan_su.update({
    where: { id: personId },
    data: { vi_tri_lam_viec_id: null },
  });
  await page
    .getByRole("dialog", { name: "Chuyển vị trí nhân sự?" })
    .getByRole("button", { name: "Chuyển vị trí", exact: true })
    .click();
  await expect(panel(page).getByRole("alert")).toContainText(
    "Hồ sơ đã thay đổi",
  );
  expect((await person()).vi_tri_lam_viec_id).toBeNull();
  await choose(page);
  await expect(panel(page)).toContainText(name);
  await page.goto("/locations");
  await page.getByRole("textbox", { name: "Tìm vị trí" }).fill("Vị trí 02");
  await page
    .getByRole("button", { name: "Xem vị trí Vị trí 02", exact: true })
    .click();
  await expect(panel(page)).toContainText(name);
});

test("read-only, location-only and other company accounts cannot assign or receive candidate data", async ({
  page,
  context,
}) => {
  await signAccount(context, reader);
  await page.goto("/office-3d/hcns");
  await page
    .getByRole("button", { name: "Chọn Vị trí 02", exact: true })
    .click();
  await expect(panel(page)).toContainText(name);
  await expect(
    page.getByRole("button", { name: "Gán nhân sự", exact: true }),
  ).toHaveCount(0);
  const payload = {
    employeeId: personId,
    locationId: seat1,
    version: (await person()).updated_at.toISOString(),
    confirmMove: true,
  };
  expect(await replay(page, payload)).toContain("Không có quyền sửa nhân sự");
  await signAccount(context, locationsOnly);
  const response = await page.goto("/office-3d/hcns");
  expect(await response!.text()).not.toContain(name);
  await expect(panel(page)).toHaveCount(0);
  await signAccount(context, foreign);
  await page.goto("/office-3d/hcns");
  await expect(
    page.getByText("Chưa thể mở phòng HCNS", { exact: true }),
  ).toBeVisible();
  expect(await replay(page, payload)).toContain("Không tìm thấy nhân sự");
  expect((await person()).vi_tri_lam_viec_id).toBe(seat2);
});

test("equipment, inactive and unlinked points offer no assignment; revoked HR permission rejects an open picker", async ({
  page,
  context,
}) => {
  await signAccount(context, manager);
  await page.goto("/office-3d/hcns");
  await page
    .getByRole("button", { name: "Chọn Vị trí 06", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Gán nhân sự", exact: true }),
  ).toHaveCount(0);
  // This test runs only on the disposable DB copy. The inactive-point fixture
  // must be empty, including historical/non-ACTIVE occupants protected by DB.
  await db.nhan_su.updateMany({
    where: { company_id: company, vi_tri_lam_viec_id: seat1 },
    data: { vi_tri_lam_viec_id: null },
  });
  await db.vi_tri.update({
    where: { id: seat1 },
    data: { dang_su_dung: false },
  });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText("Đã ngừng sử dụng");
  await expect(
    page.getByRole("button", { name: "Gán nhân sự", exact: true }),
  ).toHaveCount(0);
  const saved = await db.vi_tri.findUniqueOrThrow({ where: { id: seat1 } });
  await db.vi_tri.update({
    where: { id: seat1 },
    data: { dang_su_dung: true, parent_id: null },
  });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText("Chưa liên kết vị trí");
  await expect(
    page.getByRole("button", { name: "Gán nhân sự", exact: true }),
  ).toHaveCount(0);
  await db.vi_tri.update({
    where: { id: seat1 },
    data: { parent_id: saved.parent_id },
  });
  await page.reload();
  await choose(page);
  const grants = await db.tai_khoan_vai_tro.findMany({
    where: { account_id: manager.id },
  });
  await db.vai_tro_quyen.deleteMany({
    where: {
      role_id: { in: grants.map((g) => g.role_id) },
      quyen: { phan_he: "HR" },
    },
  });
  await page
    .getByRole("dialog", { name: "Chuyển vị trí nhân sự?" })
    .getByRole("button", { name: "Chuyển vị trí", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Chuyển vị trí nhân sự?" })
      .getByRole("alert"),
  ).toContainText("Không có quyền sửa nhân sự");
  expect((await person()).vi_tri_lam_viec_id).toBe(seat2);
});
