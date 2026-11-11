import { chooseRoomPoint, openRoomLocations } from "../helpers/office-3d";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
test.setTimeout(180000);
test.afterAll(() => db.$disconnect());
async function viewer() {
  const { companyId } = JSON.parse(
    await readFile("var/office-3d/hcns.json", "utf8"),
  );
  return db.tai_khoan.findFirstOrThrow({
    where: {
      company_id: companyId,
      cho_phep_dang_nhap: true,
      bat_buoc_doi_mat_khau: false,
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
  });
}

test("one canvas survives room entry, camera return and data refresh without navigation reloads", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const errors: string[] = [],
    documents: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.resourceType() === "document") documents.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signAccount(context, await viewer());
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc");
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await page.getByRole("button", { name: "Tập trung", exact: true }).click();
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.65,
    box!.y + box!.height * 0.6,
    { steps: 8 },
  );
  await page.mouse.up();
  // Wait for orbit damping before comparing the restored camera image.
  await page.waitForTimeout(1500);
  const before = await canvas.screenshot({
    path: "outputs/seamless-3d/camera-before.png",
  });
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const begin = Date.now();
    await page.getByRole("button", { name: /Vào phòng HCNS/ }).click();
    await expect(
      page.getByRole("heading", { name: "Không gian HCNS", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("summary", { hasText: "Danh sách vị trí" }),
    ).toBeVisible();
    times.push(Date.now() - begin);
    await chooseRoomPoint(page, "Vị trí 07");
    await expect(
      page.getByRole("button", {
        name: "Chọn Vị trí 07",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Cập nhật dữ liệu", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Cập nhật dữ liệu", exact: true }),
    ).toBeEnabled();
    expect(
      await original!.evaluate(
        (el) => el.isConnected && el === document.querySelector("canvas"),
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Trở lại tầng 2", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Thông tin phòng" }),
    ).toBeVisible();
  }
  await page.waitForTimeout(1500);
  const after = await canvas.screenshot({
    path: "outputs/seamless-3d/camera-after.png",
  });
  const a = await sharp(before).raw().toBuffer(),
    b = await sharp(after).raw().toBuffer();
  expect(b.length).toBe(a.length);
  const pixelDifference =
    a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  expect(pixelDifference).toBeLessThan(1);
  expect(documents).toHaveLength(1);
  expect(errors).toEqual([]);
  await writeFile(
    "outputs/seamless-3d/navigation-result.json",
    JSON.stringify(
      {
        enterMilliseconds: times,
        restoredCameraPixelDifference: pixelDifference,
        documentRequests: documents.length,
        sameCanvas: true,
        errors,
      },
      null,
      2,
    ),
  );
});

test("legacy link, point bookmarks, Back/Forward and mobile retain the same viewer", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signAccount(context, await viewer());
  await page.goto("/office-3d/hcns");
  await expect(page).toHaveURL(/\/office-3d\?.*mode=room/);
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await chooseRoomPoint(page, "Vị trí 07");
  await expect(page).toHaveURL(/point=hcns-07/);
  await page.goBack();
  await expect(
    page.getByRole("button", {
      name: "Chọn Vị trí 01",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(
    page.getByRole("button", {
      name: "Chọn Vị trí 07",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await original!.evaluate(
      (el) => el.isConnected && el === document.querySelector("canvas"),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await page.screenshot({
    path: "outputs/seamless-3d/hcns-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoomLocations(page);
  await page
    .getByRole("button", {
      name: "Chọn Vị trí 10",
      exact: true,
      includeHidden: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText("Vị trí 10");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: "outputs/seamless-3d/hcns-mobile.png",
    fullPage: true,
  });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: "outputs/seamless-3d/hcns-dark.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Chọn Vị trí 10",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("selecting a desk stays responsive while assignment choices are still loading", async ({
  page,
  context,
}) => {
  const account = await viewer();
  const manage = await db.tai_khoan_vai_tro.count({
    where: {
      account_id: account.id,
      vai_tro: {
        danh_sach_quyen: {
          some: {
            quyen: { phan_he: "HR", hanh_dong: "MANAGE", pham_vi: "ALL" },
          },
        },
      },
    },
  });
  test.skip(!manage, "The pilot account must already have HR MANAGE.");
  await signAccount(context, account);
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route("**/office-3d*", async (route) => {
    if (route.request().method() === "POST") {
      started = true;
      await gate;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: /Vào phòng HCNS/ }).click();
    await expect.poll(() => started).toBe(true);
    await chooseRoomPoint(page, "Vị trí 02");
    await expect(
      page.getByRole("button", {
        name: "Chọn Vị trí 02",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 1500 });
    await expect(page).toHaveURL(/point=hcns-02/);
    release();
    await page
      .getByRole("button", { name: "Gán nhân sự", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Gán nhân sự", exact: true }),
    ).toContainText("Chọn người làm việc tại Vị trí 02");
    await page.keyboard.press("Escape");
  } finally {
    release();
  }
});
