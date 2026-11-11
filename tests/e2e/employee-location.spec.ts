import { chooseRoomPoint } from "../helpers/office-3d";
import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { signAccount } from "../helpers/account-fixture";

const db = new PrismaClient();
test.skip(
  !process.env.DATABASE_URL?.includes("/sdg_hr_location_test_"),
  "Run against an isolated restored sdg_hr_location_test_* DB with the HCNS mapping.",
);
const run = randomUUID().slice(0, 8);
let person: { id: number; ho_ten: string; department_id: number | null };
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
let viewer: typeof manager, locationViewer: typeof manager;
let companyId: number, seatId: number, otherSeatId: number, foreignId: number;
let savedRequest: Request;
async function edit(page: Page) {
  await page.goto(`/employees?search=${encodeURIComponent(person.ho_ten)}`);
  await page
    .getByRole("button", { name: `Xem hồ sơ ${person.ho_ten}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
  return page.getByRole("dialog", { name: "Cập nhật hồ sơ nhân sự" });
}
async function payload() {
  const row = await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } });
  return {
    id: row.id,
    fullName: row.ho_ten,
    departmentId: row.department_id,
    employmentStatus: "ACTIVE",
    workLocationId: seatId,
    locationVersion: row.updated_at.toISOString(),
  };
}
async function replay(page: Page, value: unknown) {
  const response = await page.request.post("/employees", {
    headers: {
      "Next-Action": savedRequest.headers()["next-action"],
      "Content-Type": savedRequest.headers()["content-type"],
    },
    data: JSON.stringify([value]),
  });
  return response.text();
}
test.beforeAll(async () => {
  // Mutating tests must never consume IDs or touch HR data in the operating DB.
  if (
    !new URL(process.env.DATABASE_URL!).pathname.includes(
      "sdg_hr_location_test_",
    )
  )
    throw Error("Use the restored temporary DB for employee-location tests.");
  const mapping = JSON.parse(await readFile("var/office-3d/hcns.json", "utf8"));
  companyId = mapping.companyId;
  seatId = mapping.points.find(
    (p: { key: string }) => p.key === "hcns-07",
  ).locationId;
  otherSeatId = mapping.points.find(
    (p: { key: string }) => p.key === "hcns-09",
  ).locationId;
  const dept = await db.phong_ban.findFirstOrThrow({
    where: { company_id: companyId },
  });
  person = await db.nhan_su.create({
    data: {
      company_id: companyId,
      department_id: dept.id,
      ho_ten: `Nhân sự vị trí thử ${run}`,
      tinh_trang_lam_viec: "ACTIVE",
    },
  });
  async function account(name: string, grants: [string, string][]) {
    const permissions = await Promise.all(
      grants.map(([phan_he, hanh_dong]) =>
        db.quyen.findFirstOrThrow({
          where: { phan_he, hanh_dong, pham_vi: "ALL" },
        }),
      ),
    );
    const role = await db.vai_tro.create({
      data: {
        company_id: companyId,
        ma_vai_tro: `LOC-TEST-${name}-${run}`,
        ten_vai_tro: name,
        danh_sach_quyen: {
          create: permissions.map((p) => ({ permission_id: p.id })),
        },
      },
    });
    return db.tai_khoan.create({
      data: {
        company_id: companyId,
        ten_dang_nhap: `loc-test-${name}-${run}`,
        ten_hien_thi: name,
        mat_khau_bam: "disabled",
        danh_sach_vai_tro: { create: { role_id: role.id } },
      },
    });
  }
  manager = await account("hr", [["HR", "MANAGE"]]);
  viewer = await account("viewer", [
    ["HR", "VIEW"],
    ["LOCATIONS", "VIEW"],
  ]);
  locationViewer = await account("locations", [["LOCATIONS", "VIEW"]]);
  const other = await db.cong_ty.create({
    data: { ten_cong_ty: `Foreign HR location ${run}` },
  });
  foreignId = (
    await db.vi_tri.create({
      data: {
        company_id: other.id,
        ten_vi_tri: "Foreign private seat",
        loai_vi_tri: "CHO_NGOI",
      },
    })
  ).id;
});
test.afterAll(async () => {
  await db.$disconnect();
});
test.describe.configure({ mode: "serial" });

test("HR manager assigns an existing person, the 3D view reads the DB, and location-only access hides HR", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await signAccount(context, manager);
  const form = await edit(page);
  await form
    .getByRole("combobox", { name: "Vị trí làm việc", exact: true })
    .click();
  await page.getByRole("option", { name: /Vị trí 07$/ }).click();
  const request = page.waitForRequest(
    (r) =>
      r.method() === "POST" &&
      Boolean(r.headers()["next-action"]) &&
      (r.postData() ?? "").includes("workLocationId"),
  );
  await form.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  savedRequest = await request;
  await expect
    .poll(
      async () =>
        (await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } }))
          .vi_tri_lam_viec_id,
    )
    .toBe(seatId);
  expect(
    await db.nhat_ky_hoat_dong.count({
      where: {
        company_id: companyId,
        phan_he: "HR",
        doi_tuong_id: String(person.id),
        account_id: manager.id,
      },
    }),
  ).toBe(1);
  await signAccount(context, viewer);
  await page.goto("/office-3d/hcns");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await chooseRoomPoint(page, "Vị trí 07");
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).toContainText(person.ho_ten);
  await expect(
    page.getByRole("link", { name: "Gán trong hồ sơ nhân sự" }),
  ).toHaveCount(0);
  await signAccount(context, locationViewer);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).toHaveCount(0);
  await expect(page.getByText(person.ho_ten, { exact: true })).toHaveCount(0);
});

test("server rejects read-only, stale and foreign assignments without changing data", async ({
  page,
  context,
}) => {
  await signAccount(context, viewer);
  await page.goto("/employees");
  expect(
    await replay(page, { ...(await payload()), workLocationId: otherSeatId }),
  ).toContain("Không có quyền sửa nhân sự");
  await signAccount(context, manager);
  await page.goto("/employees");
  expect(
    await replay(page, {
      ...(await payload()),
      workLocationId: foreignId,
      confirmLocationMove: true,
    }),
  ).toContain("Chọn phòng, khu vực hoặc chỗ ngồi");
  expect(
    await replay(page, {
      ...(await payload()),
      workLocationId: otherSeatId,
      locationVersion: "2000-01-01T00:00:00.000Z",
    }),
  ).toContain("Hồ sơ đã thay đổi");
  expect(
    (await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } }))
      .vi_tri_lam_viec_id,
  ).toBe(seatId);
  expect(
    await db.nhat_ky_hoat_dong.count({
      where: {
        company_id: companyId,
        phan_he: "HR",
        doi_tuong_id: String(person.id),
        account_id: manager.id,
      },
    }),
  ).toBe(1);
});

test("HR moves then clears a workplace and the 3D location updates", async ({
  page,
  context,
}) => {
  await signAccount(context, manager);
  let form = await edit(page);
  await form
    .getByRole("combobox", { name: "Vị trí làm việc", exact: true })
    .click();
  await page.getByRole("option", { name: /Vị trí 09$/ }).click();
  await form.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await page
    .getByRole("button", { name: "Chuyển vị trí và lưu", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } }))
          .vi_tri_lam_viec_id,
    )
    .toBe(otherSeatId);
  await signAccount(context, viewer);
  await page.goto("/office-3d/hcns");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await chooseRoomPoint(page, "Vị trí 07");
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).not.toContainText(person.ho_ten);
  await chooseRoomPoint(page, "Vị trí 09");
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).toContainText(person.ho_ten);
  await signAccount(context, manager);
  form = await edit(page);
  await form
    .getByRole("combobox", { name: "Vị trí làm việc", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Chưa xác định vị trí", exact: true })
    .click();
  await form.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await db.nhan_su.findUniqueOrThrow({ where: { id: person.id } }))
          .vi_tri_lam_viec_id,
    )
    .toBeNull();
});
