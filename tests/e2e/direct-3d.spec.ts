import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Matrix4, Vector4 } from "three";
import {
  signAccount,
  fixtureSession,
  cleanFixtures,
} from "../helpers/account-fixture";
import { chooseRoomPoint } from "../helpers/office-3d";
import {
  HCNS_LAYOUT,
  personRoomPosition,
} from "../../src/lib/office-3d/hcns-layout";
import { hcnsWorldPoint } from "../../src/lib/office-3d/building-navigation";

const db = new PrismaClient();
test.skip(
  !process.env.DATABASE_URL?.includes("/sdg_hr_location_test_"),
  "Isolated DB required",
);
test.describe.configure({ mode: "serial" });
test.setTimeout(120000);
let admin: { id: number; company_id: number; phien_ban_dang_nhap: number };
let single: { id: number; ho_ten: string };
const ids: number[] = [],
  names: string[] = [];
test.beforeAll(async () => {
  const mapping = JSON.parse(await readFile("var/office-3d/hcns.json", "utf8"));
  admin = await db.tai_khoan.findFirstOrThrow({
    where: { company_id: mapping.companyId, ten_dang_nhap: "admin" },
  });
  const department = await db.phong_ban.findFirstOrThrow({
    where: { company_id: mapping.companyId },
  });
  for (let index = 0; index < 5; index++) {
    const point = mapping.points.find(
      (p: { key: string }) => p.key === (index === 4 ? "hcns-03" : "hcns-02"),
    );
    const person = await db.nhan_su.create({
      data: {
        company_id: mapping.companyId,
        department_id: department.id,
        ho_ten: `Người mẫu ${index} ${randomUUID().slice(0, 5)}`,
        tinh_trang_lam_viec: "ACTIVE",
        vi_tri_lam_viec_id: point.locationId,
      },
    });
    ids.push(person.id);
    names.push(person.ho_ten);
    if (index === 4) single = person;
  }
});
test.afterAll(async () => {
  await cleanFixtures();
  await db.nhan_su.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});

type Probe = {
  view: number[];
  projection: number[];
  zooms: number[];
  record: boolean;
  contexts: number;
  draws: number;
};
async function probe(page: Page) {
  // Observe actual rendered camera matrices; do not add test hooks to application code.
  await page.addInitScript({
    content: `(() => {
    window.__officeProbe = { view: [], projection: [], zooms: [], record: false, contexts: 0, draws: 0 };
    const seen = new WeakSet(), names = new WeakMap();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const gl = original.call(this, type, ...args);
      if (gl && ['webgl', 'webgl2'].includes(type) && !seen.has(gl)) { seen.add(gl); window.__officeProbe.contexts++; }
      return gl;
    };
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
      proto.getUniformLocation = function(program, name) { const loc = get.call(this, program, name); if(loc) names.set(loc, name); return loc; };
      proto.uniformMatrix4fv = function(loc, transpose, matrix, ...rest) {
        const result = set.call(this, loc, transpose, matrix, ...rest);
        const vp = this.getParameter(this.VIEWPORT), data = window.__officeProbe;
        if(vp[2] === this.drawingBufferWidth && vp[3] === this.drawingBufferHeight) {
          if(names.get(loc) === 'viewMatrix') data.view = Array.from(matrix);
          if(names.get(loc) === 'projectionMatrix') {
            data.projection = Array.from(matrix);
            const zoom = matrix[0] * this.canvas.clientWidth / 2;
            if(data.record && (!data.zooms.length || Math.abs(data.zooms.at(-1) - zoom) > 0.001)) data.zooms.push(zoom);
          }
        }
        return result;
      };
      for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
        const draw=proto[name]; if(!draw) continue;
        proto[name]=function(...args){window.__officeProbe.draws++;return draw.apply(this,args)};
      }
    }
  })();`,
  });
}
const readProbe = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __officeProbe: Probe }).__officeProbe,
  );
async function clickWorld(
  page: Page,
  position: [number, number, number],
  double = false,
) {
  const data = await readProbe(page);
  expect(data.view).toHaveLength(16);
  const v = new Vector4(...position, 1)
    .applyMatrix4(new Matrix4().fromArray(data.view))
    .applyMatrix4(new Matrix4().fromArray(data.projection));
  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const x = box.x + ((v.x / v.w + 1) * box.width) / 2;
  const y = box.y + ((1 - v.y / v.w) * box.height) / 2;
  if (double) await page.mouse.dblclick(x, y);
  else await page.mouse.click(x, y);
}

test("double click actual room geometry zooms continuously after idle and restores the view", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await probe(page);
  await signAccount(context, admin);
  const documents: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "document") documents.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await page.waitForTimeout(2200);
  const original = await page.locator("canvas").elementHandle();
  const before = await readProbe(page);
  await page.evaluate(() => {
    const p = (window as unknown as { __officeProbe: Probe }).__officeProbe;
    p.record = true;
    p.zooms = [];
  });
  // A point on the HCNS floor, clear of its label and furniture.
  await clickWorld(page, hcnsWorldPoint(0, 0.08, -2), true);
  await expect(page).toHaveURL(/mode=room/);
  await page.waitForTimeout(2600);
  const after = await readProbe(page);
  const initialZoom =
    (before.projection[0] *
      (await page.locator("canvas").boundingBox())!.width) /
    2;
  expect(after.zooms.length).toBeGreaterThan(10);
  expect(after.zooms[0]).toBeLessThan(
    initialZoom + (after.zooms.at(-1)! - initialZoom) * 0.2,
  );
  // Translation changes view-matrix translation; orientation stays the same.
  for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10])
    expect(after.view[i]).toBeCloseTo(before.view[i], 3);
  await expect(
    page.getByRole("button", { name: /^Trên mô hình: Vị trí/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/mode=room/);
  await page.waitForTimeout(2600);
  const returned = await readProbe(page);
  returned.view.forEach((value, i) =>
    expect(value).toBeCloseTo(before.view[i], 2),
  );
  expect(
    await original!.evaluate(
      (el) => el.isConnected && el === document.querySelector("canvas"),
    ),
  ).toBe(true);
  expect(documents).toHaveLength(1);
  expect(returned.contexts).toBe(1);
  expect(errors).toEqual([]);
  await page.waitForTimeout(1500);
  const idle = (await readProbe(page)).draws;
  await page.waitForTimeout(1000);
  expect((await readProbe(page)).draws).toBe(idle);
});

test("desk and person geometry select real records; multiple occupants and keyboard remain accessible", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await probe(page);
  await signAccount(context, admin);
  await page.goto("/office-3d/hcns");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await page.getByRole("button", { name: "Mặt bằng", exact: true }).click();
  await page.waitForTimeout(400);
  const slot = HCNS_LAYOUT[2];
  await clickWorld(page, hcnsWorldPoint(slot.x, 0.82, slot.z));
  await expect(page).toHaveURL(/point=hcns-03/);
  await expect(
    page.getByRole("region", { name: "Chi tiết vị trí" }),
  ).toContainText(single.ho_ten);
  await page.getByRole("button", { name: "Phối cảnh", exact: true }).click();
  await page.waitForTimeout(400);
  const [x, , z] = personRoomPosition(slot, 0, 1);
  await clickWorld(page, hcnsWorldPoint(x, 0.86, z));
  await expect(
    page
      .getByRole("region", { name: "Chi tiết vị trí" })
      .getByRole("heading", { name: single.ho_ten, exact: true }),
  ).toBeVisible();
  await chooseRoomPoint(page, "Vị trí 02");
  for (const name of names.slice(0, 4))
    await expect(
      page.getByRole("region", { name: "Nhân sự tại vị trí" }),
    ).toContainText(name);
  await expect(page.locator('[data-person-marker="group"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  const choice = page.getByRole("button", {
    name: "Chọn Vị trí 08",
    exact: true,
  });
  await choice.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/point=hcns-08/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("location-only access receives neither people nor name labels", async ({
  page,
  context,
}) => {
  await fixtureSession(context, "LOCATIONS", "VIEW");
  const response = await page.goto(
    "/office-3d?floor=2&room=t2_hcns_pc&mode=room",
  );
  const html = await response!.text();
  for (const name of names) expect(html).not.toContain(name);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.locator("[data-person-marker]")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Nhân sự tại vị trí" }),
  ).toHaveCount(0);
});
