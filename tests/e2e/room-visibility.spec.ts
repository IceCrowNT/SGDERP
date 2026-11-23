/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { signAccount } from '../helpers/account-fixture';
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

// Read the development Canvas store without exposing scene internals in the app.
// Check actual mesh opacity, not just HTML labels which survive invisible models.
async function sceneObjects(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as any;
    let fiber = canvas[Object.keys(canvas).find(k => k.startsWith('__reactFiber'))!];
    let state: any;
    for (; fiber && !state; fiber = fiber.return) {
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        if (hook.memoizedState?.current?.scene) { state = hook.memoizedState.current; break; }
      }
    }
    if (!state) throw new Error('Canvas store not found');
    const people: { id: number; opacity: number[] }[] = [];
    const assets: number[] = [];
    state.scene.traverse((node: any) => {
      let visible = true;
      for (let parent = node; parent; parent = parent.parent) visible &&= parent.visible;
      if (!visible) return;
      if (node.userData.assetId && node.userData.equipmentKind) {
        let opaque = true;
        node.traverse((mesh: any) => {
          if (mesh.isMesh && mesh.material.isMeshStandardMaterial) opaque &&= mesh.material.opacity === 1;
        });
        if (opaque) assets.push(node.userData.assetId);
      }
      if (node.name === 'office-person') {
        let parent = node.parent;
        while (parent && !parent.userData.personId) parent = parent.parent;
        const opacity: number[] = [];
        node.traverse((mesh: any) => { if (mesh.isMesh) opacity.push(mesh.material.opacity); });
        people.push({ id: parent?.userData.personId, opacity });
      }
    });
    return { people, assets };
  });
}

test('room and floor fades preserve people; the shallow HCNS desk renders Canon 251', async ({ page, context }) => {
  const account = await db.tai_khoan.findFirstOrThrow({ where: {
    cho_phep_dang_nhap: true, bat_buoc_doi_mat_khau: false,
    AND: ['LOCATIONS', 'ASSETS', 'HR'].map(phan_he => ({ danh_sach_vai_tro: { some: { vai_tro: {
      danh_sach_quyen: { some: { quyen: { phan_he, hanh_dong: 'MANAGE' } } },
    } } } })),
  } });
  const printer = await db.tai_san.findFirst({ where: { company_id: account.company_id, ten_tai_san: { contains: '251' } } });
  const occupants = await db.nhan_su.findMany({ where: { company_id: account.company_id,
    vi_tri_lam_viec: { vi_tri_cha: { ten_vi_tri: 'Phòng Kế hoạch Đầu tư' } }, tinh_trang_lam_viec: 'ACTIVE',
  }, select: { id: true } });
  test.skip(!printer || occupants.length === 0, 'Requires surveyed rooms with people and Canon 251; no fixtures written');
  await signAccount(context, account);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/office-3d?floor=2&room=t2_hcns_pc&mode=room');
  const canvas = page.locator('canvas[data-building-ready=true]');
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const original = await canvas.elementHandle();
  await expect.poll(async () => (await sceneObjects(page)).assets).toContain(printer!.id);
  await page.screenshot({ path: 'outputs/3d-visibility/hcns-printer.png' });
  for (let round = 0; round < 2; round++) {
    await page.getByRole('button', { name: 'Trở lại tầng 2', exact: true }).click();
    await page.getByRole('button', { name: 'Trên mô hình: Phòng Kế hoạch Đầu tư', exact: true }).dblclick();
    await expect(page).toHaveURL(/room=plan_t2_phai_truoc&mode=room/);
    await expect.poll(async () => {
      const { people } = await sceneObjects(page);
      return occupants.every(p => people.some(model => model.id === p.id && model.opacity.length === 4 && model.opacity.every(o => o === 1)));
    }).toBe(true);
    if (round === 0) {
      await page.waitForTimeout(1800); // Capture the settled camera, after the fade.
      await page.screenshot({ path: 'outputs/3d-visibility/khdt-people.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: 'outputs/3d-visibility/khdt-mobile.png' });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.getByRole('button', { name: 'Trở lại tầng 2', exact: true }).click();
    await page.getByRole('button', { name: 'Tầng 1', exact: true }).click();
    await page.getByRole('button', { name: 'Tầng 2', exact: true }).click();
    await page.getByRole('button', { name: 'Trên mô hình: Phòng Hành Chính Tổng Hợp', exact: true }).dblclick();
    await expect.poll(async () => (await sceneObjects(page)).assets).toContain(printer!.id);
  }
  expect(await original!.evaluate(el => el.isConnected && el === document.querySelector('canvas'))).toBe(true);
  expect(errors).toEqual([]);
});
