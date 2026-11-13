import { chooseRoomPoint, openRoomLocations, refreshOfficeData } from "../helpers/office-3d";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { signAccount } from "../helpers/account-fixture";
import { RoomMappingSchema } from "../../src/lib/office-3d/room-mapping";

// Read-only pilot checks: never create/delete location fixtures in the operating DB.
const db = new PrismaClient();
test.afterAll(async () => {
  await db.$disconnect();
});
async function pilot() {
  const raw = await readFile(
    path.join(process.cwd(), "var/office-3d/hcns.json"),
    "utf8",
  ).catch(() => null);
  test.skip(!raw, "Local HCNS pilot has not been imported.");
  const mapping = RoomMappingSchema.parse(JSON.parse(raw!));
  const viewer = await db.tai_khoan.findFirst({
    where: {
      company_id: mapping.companyId,
      cho_phep_dang_nhap: true,
      bat_buoc_doi_mat_khau: false,
      danh_sach_vai_tro: {
        some: {
          vai_tro: {
            company_id: mapping.companyId,
            danh_sach_quyen: {
              some: {
                quyen: {
                  phan_he: "LOCATIONS",
                  pham_vi: "ALL",
                  hanh_dong: { in: ["VIEW", "MANAGE"] },
                },
              },
            },
          },
        },
      },
    },
  });
  test.skip(!viewer, "A pilot account must be granted LOCATIONS explicitly.");
  return { mapping, viewer: viewer! };
}

test("HCNS shows ten DB locations, notes, camera controls and responsive layouts", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const { mapping, viewer } = await pilot();
  const rows = await db.vi_tri.findMany({
    where: { company_id: mapping.companyId, parent_id: mapping.roomId },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await signAccount(context, viewer);
  await page.goto("/office-3d/hcns");
  await expect(
    page.getByRole("heading", { name: "Không gian HCNS", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 60000,
  });
  await openRoomLocations(page);
  await expect(page.getByRole("button", { name: /^Chọn Vị trí/ })).toHaveCount(
    10,
  );
  for (const point of mapping.points) {
    const row = rows.find((r) => r.id === point.locationId)!;
    await page
      .getByRole("button", { name: `Chọn ${row.ten_vi_tri}`, exact: true })
      .click();
    const panel = page.getByRole("region", { name: "Chi tiết vị trí" });
    await expect(
      panel.getByRole("heading", { name: row.ten_vi_tri, exact: true }),
    ).toBeVisible();
    if (row.mo_ta) await expect(panel).toContainText(row.mo_ta);
    else
      await expect(panel).toContainText(
        "Chưa có thông tin người sử dụng hoặc thiết bị",
      );
    await expect(page.getByText(row.ma_vi_tri, { exact: true })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mặt bằng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Tập trung", exact: true }).click();
  await page
    .getByRole("button", { name: "Đặt lại góc nhìn", exact: true })
    .click();
  await chooseRoomPoint(page, "Vị trí 07");
  await expect(
    page.getByRole("button", {
      name: "Chọn Vị trí 07",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await refreshOfficeData(page);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await openRoomLocations(page);
  await page
    .getByRole("button", {
      name: "Chọn Vị trí 03",
      exact: true,
      includeHidden: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Chọn Vị trí 03",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("HCNS hides data from unprivileged accounts and invalid tenant sessions", async ({
  page,
  context,
}) => {
  const { mapping, viewer } = await pilot();
  const unprivileged = await db.tai_khoan.findFirst({
    where: {
      company_id: mapping.companyId,
      cho_phep_dang_nhap: true,
      NOT: {
        danh_sach_vai_tro: {
          some: {
            vai_tro: {
              danh_sach_quyen: {
                some: {
                  quyen: {
                    phan_he: "LOCATIONS",
                    hanh_dong: { in: ["VIEW", "MANAGE"] },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  test.skip(!unprivileged, "No local account without LOCATIONS to verify.");
  await signAccount(context, unprivileged!);
  await page.goto("/office-3d/hcns");
  // Existing users also need a password change. This deliberately minimal JWT
  // verifies the server checks the DB, without changing any operating account.
  await expect(
    page.getByText("Bạn chưa được cấp quyền xem vị trí & không gian."),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await signAccount(context, { ...viewer, company_id: 2147483646 });
  await page.goto("/office-3d/hcns");
  await expect(
    page.getByText("Chưa thể mở mô hình tòa nhà", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toHaveCount(0);
});

test("HCNS retains accessible data when WebGL is unavailable", async ({
  page,
  context,
}) => {
  const { viewer } = await pilot();
  await signAccount(context, viewer);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/office-3d/hcns");
  await expect(
    page.getByText(/Không thể hiển thị 3D trên trình duyệt này/),
  ).toBeVisible();
  await chooseRoomPoint(page, "Vị trí 06");
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText("máy in");
});
