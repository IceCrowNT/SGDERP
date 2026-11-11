import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
test.skip(
  !process.env.DATABASE_URL?.includes("/sdg_hr_location_test_"),
  "Isolated database required; no operating data fixtures.",
);
test.describe.configure({ mode: "serial" });
let companyId: number,
  roomId: number,
  seatId: number,
  floorId: number,
  personId: number,
  unassignedId: number;
let viewer: { id: number; company_id: number; phien_ban_dang_nhap: number },
  locationsOnly: typeof viewer,
  hrOnly: typeof viewer,
  foreign: typeof viewer;
let roomName: string;
const run = randomUUID().slice(0, 7);
const name = `Người đã gán ${run}`,
  absent = `Người chỉ cùng phòng ban ${run}`;
async function openHcns(page: Page) {
  await page.goto("/office-3d");
  await page
    .getByRole("button", { name: "Đến phòng HCNS", exact: true })
    .click();
  return page.getByRole("region", { name: "Thông tin phòng" });
}
test.beforeAll(async () => {
  const mapping = JSON.parse(await readFile("var/office-3d/hcns.json", "utf8"));
  companyId = mapping.companyId;
  roomId = mapping.roomId;
  seatId = mapping.points.find(
    (p: { key: string }) => p.key === "hcns-07",
  ).locationId;
  const room = await db.vi_tri.findUniqueOrThrow({ where: { id: roomId } });
  floorId = room.parent_id!;
  roomName = room.ten_vi_tri;
  const department = await db.phong_ban.findFirstOrThrow({
    where: { company_id: companyId },
  });
  personId = (
    await db.nhan_su.create({
      data: {
        company_id: companyId,
        department_id: department.id,
        ho_ten: name,
        tinh_trang_lam_viec: "ACTIVE",
        vi_tri_lam_viec_id: seatId,
      },
    })
  ).id;
  unassignedId = (
    await db.nhan_su.create({
      data: {
        company_id: companyId,
        department_id: department.id,
        ho_ten: absent,
        tinh_trang_lam_viec: "ACTIVE",
      },
    })
  ).id;
  async function account(label: string, modules: string[], tenant = companyId) {
    const permissions = await db.quyen.findMany({
      where: { phan_he: { in: modules }, hanh_dong: "VIEW", pham_vi: "ALL" },
    });
    const role = await db.vai_tro.create({
      data: {
        company_id: tenant,
        ma_vai_tro: `BUILD-${label}-${run}`,
        ten_vai_tro: "Building test",
        danh_sach_quyen: {
          create: permissions.map((p) => ({ permission_id: p.id })),
        },
      },
    });
    return db.tai_khoan.create({
      data: {
        company_id: tenant,
        ten_dang_nhap: `building-${label}-${run}`,
        ten_hien_thi: "Building test",
        mat_khau_bam: "disabled",
        danh_sach_vai_tro: { create: { role_id: role.id } },
      },
    });
  }
  viewer = await account("viewer", ["LOCATIONS", "HR"]);
  locationsOnly = await account("locations", ["LOCATIONS"]);
  hrOnly = await account("hr", ["HR"]);
  const other = await db.cong_ty.create({
    data: { ten_cong_ty: `Building foreign ${run}` },
  });
  foreign = await account("foreign", ["LOCATIONS", "HR"], other.id);
});
test.afterAll(() => db.$disconnect());
test("explore three floors, enter HCNS, return and use mobile without errors", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signAccount(context, viewer);
  await page.goto("/office-3d");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await expect(
    page
      .getByRole("group", { name: "Chọn tầng" })
      .getByRole("button", { name: "Toàn tòa nhà", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Xem mô hình tầng 3", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Danh sách phòng" })
      .getByRole("button", { name: /Xem phòng/ }),
  ).toHaveCount(4);
  await page
    .getByRole("group", { name: "Chọn tầng" })
    .getByRole("button", { name: "Tầng 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Trên mô hình: ${roomName}`, exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Thông tin phòng" }),
  ).toContainText(roomName);
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mặt bằng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tập trung", exact: true }).click();
  await page
    .getByRole("button", { name: "Phóng to mô hình", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đặt lại góc nhìn", exact: true })
    .click();
  await page.getByRole("link", { name: /Vào phòng HCNS/ }).click();
  await expect(
    page.getByRole("heading", { name: "Không gian HCNS", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await expect(page.locator("canvas[data-room-ready=true]")).toBeVisible({ timeout: 90000 });
  await page
    .getByRole("button", { name: "Chọn Vị trí 07", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).toContainText(name);
  await page
    .getByRole("link", { name: "Tòa nhà · Tầng 2", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Thông tin phòng" }),
  ).toContainText(roomName);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("link", { name: /Vào phòng HCNS/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page
    .getByRole("textbox", { name: "Tìm phòng trong mô hình" })
    .fill("ke hoach");
  await expect(
    page
      .getByRole("region", { name: "Danh sách phòng" })
      .getByRole("button", { name: /Xem phòng/ }),
  ).toHaveCount(1);
  await page
    .getByRole("region", { name: "Danh sách phòng" })
    .getByRole("button", { name: /Xem phòng/ })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Thông tin phòng" }),
  ).toContainText("Kế Hoạch - Đầu Tư");
  expect(errors).toEqual([]);
});
test("building uses workplace links, reflects DB changes, and drops stale room hierarchy", async ({
  page,
  context,
}) => {
  await signAccount(context, viewer);
  let panel = await openHcns(page);
  await expect(panel).toContainText(name);
  await expect(panel).not.toContainText(absent);
  await db.nhan_su.update({
    where: { id: personId },
    data: { tinh_trang_lam_viec: "LEFT" },
  });
  await page.getByRole("button", { name: "Cập nhật", exact: true }).click();
  await expect(panel).not.toContainText(name);
  await db.nhan_su.update({
    where: { id: personId },
    data: { tinh_trang_lam_viec: "ACTIVE" },
  });
  await db.vi_tri.update({
    where: { id: roomId },
    data: { ten_vi_tri: `HCNS đổi tên ${run}` },
  });
  await page.getByRole("button", { name: "Cập nhật", exact: true }).click();
  await expect(panel).toContainText(`HCNS đổi tên ${run}`);
  const building = JSON.parse(
    await readFile("var/office-3d/building.json", "utf8"),
  );
  const otherFloor = building.floors.find(
    (f: { floor: number }) => f.floor === 1,
  ).locationId;
  try {
    await db.vi_tri.update({
      where: { id: roomId },
      data: { parent_id: otherFloor },
    });
    await page.reload();
    panel = page.getByRole("region", { name: "Thông tin phòng" });
    await page
      .getByRole("group", { name: "Chọn tầng" })
      .getByRole("button", { name: "Tầng 2", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Xem phòng Phòng HCNS & Pháp Chế, tầng 2",
        exact: true,
      })
      .click();
    await expect(panel).toContainText("Chưa có dữ liệu vị trí");
    await expect(panel).not.toContainText(name);
    await expect(
      page.getByRole("link", { name: /Vào phòng HCNS/ }),
    ).toHaveCount(0);
  } finally {
    await db.vi_tri.update({
      where: { id: roomId },
      data: { parent_id: floorId, ten_vi_tri: roomName },
    });
  }
  expect(
    await db.nhan_su.findUnique({ where: { id: unassignedId } }),
  ).not.toBeNull();
});
test("location access does not disclose HR; no access and other company cannot load the building", async ({
  page,
  context,
}) => {
  await signAccount(context, locationsOnly);
  await openHcns(page);
  await expect(
    page.getByRole("region", { name: "Nhân sự trong không gian" }),
  ).toHaveCount(0);
  expect(await page.content()).not.toContain(name);
  await expect(
    page.getByRole("link", { name: "Bản đồ 3D Tòa nhà", exact: false }).first(),
  ).toBeVisible();
  await signAccount(context, hrOnly);
  await page.goto("/office-3d");
  await expect(
    page.getByText("Bạn chưa được cấp quyền xem vị trí & không gian.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await signAccount(context, foreign);
  await page.goto("/office-3d");
  await expect(
    page.getByText("Chưa thiết lập mô hình tòa nhà cho công ty của bạn.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.content()).not.toContain(roomName);
  await signAccount(context, locationsOnly);
  await db.tai_khoan_vai_tro.deleteMany({
    where: { account_id: locationsOnly.id },
  });
  await page.goto("/office-3d");
  await expect(
    page.getByText("Bạn chưa được cấp quyền xem vị trí & không gian.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("WebGL failure keeps floor selection and accessible room information", async ({
  page,
  context,
}) => {
  await signAccount(context, viewer);
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.includes("webgl")) return null;
      return Reflect.apply(get, this, [kind, ...args]);
    } as typeof get;
  });
  await page.goto("/office-3d");
  await expect(
    page.getByText(/Không thể hiển thị 3D trên trình duyệt này/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Đến phòng HCNS", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Thông tin phòng" }),
  ).toContainText(name);
  await expect(
    page.getByRole("link", { name: /Vào phòng HCNS/ }),
  ).toBeVisible();
});
