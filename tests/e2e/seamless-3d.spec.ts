import { chooseRoomPoint, openRoomLocations, refreshOfficeData } from "../helpers/office-3d";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { signAccount } from "../helpers/account-fixture";
import { Matrix4, Vector4 } from "three";
import { HCNS_LAYOUT } from "../../src/lib/office-3d/hcns-layout";
import { BUILDING_ROOMS, HCNS_BUILDING_KEY } from "../../src/lib/office-3d/building-layout";
import { hcnsWorldPoint } from "../../src/lib/office-3d/building-navigation";
const db = new PrismaClient();
test.setTimeout(180000);
test.afterAll(() => db.$disconnect());
const pointNames = new Map<string,string>();
test.beforeAll(async()=>{
  const mapping=JSON.parse(await readFile("var/office-3d/hcns.json","utf8"));
  const points=mapping.points as {key:string;locationId:number}[];
  const rows=await db.vi_tri.findMany({where:{id:{in:points.map(p=>p.locationId)}},select:{id:true,ten_vi_tri:true}});
  for(const point of points) pointNames.set(point.key,rows.find(r=>r.id===point.locationId)!.ten_vi_tri);
});
const pointName=(key:string)=>pointNames.get(key)!;

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

test("lost WebGL can retry the scene without reloading the page or losing room selection", async ({ page, context }) => {
  await signAccount(context, await viewer());
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc");
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const originalDocument = await page.locator("html").elementHandle();
  const url = page.url();
  for (let attempt = 0; attempt < 2; attempt++) {
    await canvas.evaluate(el => el.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
    await expect(page.getByRole("region", { name: "Danh sách không gian", exact: true })).toBeVisible();
    await expect(page.getByTestId("spaces-floor-2")).toHaveAttribute("open", "");
    await page.getByRole("button", { name: "Tải lại mô hình", exact: true }).click();
    await expect(canvas).toBeVisible({ timeout: 30000 });
    expect(page.url()).toBe(url);
    expect(await originalDocument!.evaluate(el => el === document.documentElement)).toBe(true);
    await expect(page.getByRole("region", { name: "Thông tin phòng" })).toBeVisible();
  }
});

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
    await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Không gian HCNS", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("summary", { hasText: "Danh sách vị trí" }),
    ).toBeVisible();
    times.push(Date.now() - begin);
    await chooseRoomPoint(page, pointName("hcns-07"));
    await expect(
      page.getByRole("button", {
        name: `Chọn ${pointName("hcns-07")}`,
        exact: true,
        includeHidden: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await refreshOfficeData(page);
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
  const mapping = JSON.parse(await readFile("var/office-3d/hcns.json", "utf8"));
  const locationId = mapping.points.find((p: {key: string}) => p.key === "hcns-10").locationId;
  const locationName = (await db.vi_tri.findUniqueOrThrow({where: {id: locationId}, select: {ten_vi_tri: true}})).ten_vi_tri;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signAccount(context, await viewer());
  await page.goto("/office-3d/hcns");
  await expect(page).toHaveURL(/\/office-3d\?.*mode=room/);
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await chooseRoomPoint(page, pointName("hcns-07"));
  await expect(page).toHaveURL(/point=hcns-07/);
  await page.goBack();
  await expect(
    page.getByRole("button", {
      name: `Chọn ${pointName("hcns-01")}`,
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.goForward();
  await expect(
    page.getByRole("button", {
      name: `Chọn ${pointName("hcns-07")}`,
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
      name: `Chọn ${locationName}`,
      exact: true,
      includeHidden: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText(locationName);
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
      name: `Chọn ${locationName}`,
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
    await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
    await chooseRoomPoint(page, pointName("hcns-01"));
    await expect.poll(() => started).toBe(true);
    await chooseRoomPoint(page, pointName("hcns-02"));
    await expect(
      page.getByRole("button", {
        name: `Chọn ${pointName("hcns-02")}`,
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
    ).toContainText(`Chọn người làm việc tại ${pointName("hcns-02")}`);
    await page.keyboard.press("Escape");
  } finally {
    release();
  }
});

test("room overview clears selections, preserves Canvas and ignores orbit and placement clicks", async ({ page, context }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signAccount(context, await viewer());
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc");
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  const overview = page.getByRole("region", { name: "Thông tin phòng", exact: true });
  await expect(overview).toBeVisible();
  expect(new URL(page.url()).searchParams.get("point")).toBeNull();
  await chooseRoomPoint(page, pointName("hcns-07"));
  await page.getByRole("button", { name: "Tổng quan phòng HCNS", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(overview).toBeVisible();
  await expect(page.getByRole("region", { name: "Chi tiết vị trí", exact: true })).toHaveCount(0);
  await chooseRoomPoint(page, pointName("hcns-07"));
  const b = (await canvas.boundingBox())!;
  await page.mouse.move(b.x + 15, b.y + 15);
  await page.mouse.down();
  await page.mouse.move(b.x + 90, b.y + 60, { steps: 8 });
  await page.mouse.up();
  await expect(page).toHaveURL(/point=hcns-07/);
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await expect(page).toHaveURL(/point=hcns-07/);
  await canvas.click({ position: { x: 8, y: 8 }, button: "right" });
  await expect(page.getByRole("menu", { name: "Thao tác trên mô hình" })).toBeVisible();
  await expect(page).toHaveURL(/point=hcns-07/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/point=hcns-07/);
  await canvas.click({ position: { x: 8, y: 8 } });
  await expect(overview).toBeVisible();
  expect(new URL(page.url()).searchParams.get("mode")).toBe("room");
  expect(new URL(page.url()).searchParams.get("point")).toBeNull();
  if (await page.getByRole("button", { name: "Thêm vị trí", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "Thêm vị trí", exact: true }).click();
    const form = page.getByRole("form", { name: "Bố trí vị trí trên 3D" });
    await form.getByLabel("Tên vị trí").fill("Bản nháp chưa lưu");
    await canvas.click({ position: { x: 8, y: 8 } });
    await expect(form.getByLabel("Tên vị trí")).toHaveValue("Bản nháp chưa lưu");
    await form.getByRole("button", { name: "Hủy", exact: true }).click();
  }
  expect(await original!.evaluate(el => el.isConnected && el === document.querySelector("canvas"))).toBe(true);
  await page.getByRole("button", { name: "Tổng quan phòng HCNS", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "outputs/seamless-3d/room-overview.png" });
  expect(errors).toEqual([]);
});

test("context menu targets the actual desk, shares toolbar commands and Escape unwinds selection", async ({ page, context }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Observe camera matrices to click a real mesh, not a hard-coded screenshot pixel.
  await page.addInitScript(() => {
    const target = window as unknown as { sceneProbe: { view: number[]; projection: number[] } };
    target.sceneProbe = { view: [], projection: [] };
    const names = new WeakMap<WebGLUniformLocation, string>();
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
      proto.getUniformLocation = function(program, name) { const loc = get.call(this, program, name); if (loc) names.set(loc, name); return loc; };
      proto.uniformMatrix4fv = function(loc: WebGLUniformLocation | null, transpose: boolean, data: Float32List) {
        const result = set.call(this, loc, transpose, data), vp = this.getParameter(this.VIEWPORT);
        if (loc && vp[2] === this.drawingBufferWidth && vp[3] === this.drawingBufferHeight) {
          if (names.get(loc) === "viewMatrix") target.sceneProbe.view = Array.from(data);
          if (names.get(loc) === "projectionMatrix") target.sceneProbe.projection = Array.from(data);
        }
        return result;
      };
    }
  });
  await signAccount(context, await viewer());
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc&mode=room");
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Math.abs((window as unknown as { sceneProbe: { view: number[] } }).sceneProbe.view[5] ?? 1))).toBeLessThan(.01);
  const matrices = await page.evaluate(() => (window as unknown as { sceneProbe: { view: number[]; projection: number[] } }).sceneProbe);
  const desk = HCNS_LAYOUT.find(p => p.key === "hcns-04")!;
  const v = new Vector4(...hcnsWorldPoint(desk.x + desk.width * .35, .82, desk.z + desk.depth * .35), 1)
    .applyMatrix4(new Matrix4().fromArray(matrices.view)).applyMatrix4(new Matrix4().fromArray(matrices.projection));
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + (v.x/v.w+1)*box.width/2, box.y + (1-v.y/v.w)*box.height/2, { button: "right" });
  const menu = page.getByRole("menu", { name: "Thao tác trên mô hình" });
  await expect(menu).toBeVisible();
  await expect(page).toHaveURL(/point=hcns-04/);
  await expect(menu).toContainText(pointName("hcns-04"));
  // The surveyed fixed desks are not editable by the new-object editor.
  await expect(menu.getByRole("menuitem", { name: "Chỉnh bố trí", exact: true })).toHaveCount(0);
  await page.screenshot({ path: "outputs/seamless-3d/context-desk.png" });
  const contextCommands = await menu.getByRole("menuitem").allTextContents();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page).toHaveURL(/point=hcns-04/);
  await page.getByRole("button", { name: "Thao tác không gian", exact: true }).click();
  expect(await page.getByRole("menuitem").allTextContents()).toEqual(contextCommands);
  await page.getByRole("menuitem", { name: "Tổng quan phòng", exact: true }).click();
  await expect(page.getByRole("region", { name: "Thông tin phòng", exact: true })).toBeVisible();
  await chooseRoomPoint(page, pointName("hcns-07"));
  await page.keyboard.press("Escape");
  expect(new URL(page.url()).searchParams.get("point")).toBeNull();
  expect(new URL(page.url()).searchParams.get("mode")).toBe("room");
  await page.keyboard.press("Escape");
  expect(new URL(page.url()).searchParams.get("mode")).toBeNull();
  // Escape reached floor overview; select the room again before re-entering.
  await page.getByRole("button", {name:"Trên mô hình: Phòng Hành Chính Tổng Hợp",exact:true}).click();
  // Both methods keep the same renderer. Mobile uses the visible menu button.
  await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseRoomPoint(page, pointName("hcns-07"));
  await page.getByRole("button", { name: "Thao tác không gian", exact: true }).click();
  await page.screenshot({ path: "outputs/seamless-3d/context-mobile.png" });
  await page.getByRole("menuitem", { name: "Tổng quan phòng", exact: true }).click();
  await expect(page.getByRole("region", { name: "Thông tin phòng", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await original!.evaluate(el => el.isConnected && el === document.querySelector("canvas"))).toBe(true);
  expect(errors).toEqual([]);
});

test("KHDT added objects use the same context actions and editing preserves an unsaved draft", async ({ page, context }) => {
  const mapping = JSON.parse(await readFile("var/office-3d/building.json", "utf8"));
  const binding = mapping.rooms.find((r: { key: string }) => r.key === "plan_t2_phai_truoc");
  test.skip(!binding, "Requires the existing KHDT room mapping.");
  const object = await db.vat_the_3d.findFirst({ where: { company_id: mapping.companyId, phong_id: binding.locationId }, include: { vi_tri: true } });
  test.skip(!object, "Requires an existing KHDT object; this test creates no operational data.");
  const before = JSON.stringify(object);
  await signAccount(context, await viewer());
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/office-3d?floor=2&room=plan_t2_phai_truoc&point=object-${object!.id}`);
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  await page.getByRole("button", { name: "Tập trung", exact: true }).click();
  const label = page.getByRole("button", { name: `Xem vị trí ${object!.vi_tri.ten_vi_tri}`, exact: true });
  await expect(label).toBeVisible();
  await label.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Thao tác trên mô hình" });
  await expect(menu).toContainText(object!.vi_tri.ten_vi_tri);
  await expect(page).toHaveURL(new RegExp(`point=object-${object!.id}`));
  const edit = menu.getByRole("menuitem", { name: "Chỉnh bố trí", exact: true });
  test.skip(!(await edit.isVisible()), "Existing viewer does not have LOCATIONS MANAGE.");
  await edit.click();
  const form = page.getByRole("form", { name: "Bố trí vị trí trên 3D" });
  await form.getByLabel("Tên vị trí").fill("Bản nháp kiểm tra, không lưu");
  await canvas.click({ position: { x: 8, y: 8 }, button: "right" });
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thao tác không gian", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(form.getByLabel("Tên vị trí")).toHaveValue("Bản nháp kiểm tra, không lưu");
  await form.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(form).toHaveCount(0);
  await page.getByRole("button", { name: "Tổng quan phòng", exact: true }).click();
  await expect(page.getByRole("region", { name: "Thông tin phòng", exact: true })).toBeVisible();
  expect(JSON.stringify(await db.vat_the_3d.findUnique({ where: { id: object!.id }, include: { vi_tri: true } }))).toBe(before);
  await expect(page.getByRole("button", { name: `Xem vị trí ${object!.vi_tri.ten_vi_tri}`, exact: true, includeHidden: true })).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: "outputs/seamless-3d/khdt-overview-final.png" });
});


test("HCNS equipment points remain selectable through hidden floor outlines", async ({ page, context }) => {
  const account = await viewer();
  const shape = BUILDING_ROOMS.find(r => r.key === HCNS_BUILDING_KEY)!;
  const objects = await db.vat_the_3d.findMany({
    where: { company_id: account.company_id, vi_tri: { ten_vi_tri: { in: ["Máy hủy giấy", "Tủ đồ"] } } },
    include: { vi_tri: true },
  });
  test.skip(objects.length !== 2, "Requires the two existing HCNS points; creates no operational data.");
  const before = JSON.stringify(objects);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Observe camera matrices to click a real mesh, not a hard-coded screenshot pixel.
  await page.addInitScript(() => {
    const target = window as unknown as { sceneProbe: { view: number[]; projection: number[] } };
    target.sceneProbe = { view: [], projection: [] };
    const names = new WeakMap<WebGLUniformLocation, string>();
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
      proto.getUniformLocation = function(program, name) { const loc = get.call(this, program, name); if (loc) names.set(loc, name); return loc; };
      proto.uniformMatrix4fv = function(loc: WebGLUniformLocation | null, transpose: boolean, data: Float32List) {
        const result = set.call(this, loc, transpose, data), vp = this.getParameter(this.VIEWPORT);
        if (loc && vp[2] === this.drawingBufferWidth && vp[3] === this.drawingBufferHeight) {
          if (names.get(loc) === "viewMatrix") target.sceneProbe.view = Array.from(data);
          if (names.get(loc) === "projectionMatrix") target.sceneProbe.projection = Array.from(data);
        }
        return result;
      };
    }
  });

  await signAccount(context, account);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc&mode=room");
  const canvas = page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  for (const view of ["Mặt bằng", "Phối cảnh"]) {
    for (const object of objects) {
      await page.getByRole("button", { name: view, exact: true }).click();
      // Wait for demand-rendered camera matrices after changing view.
      await page.waitForTimeout(1000);
      const matrices = await page.evaluate(() => (window as unknown as { sceneProbe: { view: number[]; projection: number[] } }).sceneProbe);
      const target = new Vector4(shape.x + object.toa_do_x, .4, shape.z + object.toa_do_z, 1)
        .applyMatrix4(new Matrix4().fromArray(matrices.view)).applyMatrix4(new Matrix4().fromArray(matrices.projection));
      const bounds = (await canvas.boundingBox())!;
      const x = bounds.x + (target.x / target.w + 1) * bounds.width / 2;
      const y = bounds.y + (1 - target.y / target.w) * bounds.height / 2;
      await page.mouse.click(x, y);
      await expect(page).toHaveURL(new RegExp(`point=object-${object.id}(?:&|$)`));
      const details = page.getByRole("region", { name: "Chi tiết vị trí", exact: true });
      await expect(details.getByRole("heading", { name: object.vi_tri.ten_vi_tri, exact: true })).toBeVisible();
      await page.mouse.click(x, y, { button: "right" });
      const menu = page.getByRole("menu", { name: "Thao tác trên mô hình" });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText(object.vi_tri.ten_vi_tri);
      await page.keyboard.press("Escape");
      await page.getByTestId("building-workspace").screenshot({ path: `outputs/hcns-inspect/fixed-${object.id}-${view === "Mặt bằng" ? "top" : "perspective"}.png` });
      await canvas.click({ position: { x: 12, y: 190 } });
      await expect(page.getByRole("region", { name: "Thông tin phòng", exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.has("point")).toBe(false);
    }
  }
  expect(await original!.evaluate(el => el.isConnected && el === document.querySelector("canvas"))).toBe(true);
  expect(errors).toEqual([]);
  expect(JSON.stringify(await db.vat_the_3d.findMany({ where: { id: { in: objects.map(o => o.id) } }, include: { vi_tri: true } }))).toBe(before);
});
