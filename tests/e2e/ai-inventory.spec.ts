import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { signAccount } from '../helpers/account-fixture';
test.skip(!/^\/sdg_ai_governance_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/none').pathname), 'Isolated database and provider mock only');
test.setTimeout(90000);
const db = new PrismaClient();
const fixture = process.env.AI_DASHBOARD_FIXTURE ? JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE, 'utf8')) : {};
const chat = (p: Page) => p.getByRole('region', { name: 'Trợ lý AI', exact: true });
const input = (p: Page) => chat(p).getByRole('textbox', { name: 'Yêu cầu AI' });
const panel = (p: Page) => p.getByRole('complementary', { name: 'Chi tiết công việc AI', exact: true });
const stock = async () => (await db.$queryRaw<{ so_luong: bigint }[]>`SELECT so_luong FROM ton_vat_tu(${fixture.itemId}::int)`).reduce((n,r)=>n+Number(r.so_luong),0);
async function prepare(p: Page, message: string) {
  await input(p).fill(message); await chat(p).getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await expect(panel(p).getByRole('button', { name: 'Kiểm tra và lưu', exact: true })).toBeVisible({ timeout: 30000 });
}
async function review(p: Page) {
  await panel(p).getByRole('button', { name: 'Kiểm tra và lưu', exact: true }).click();
  return p.getByRole('dialog', { name: 'Kiểm tra hồ sơ trước khi lưu' });
}
test.beforeEach(async ({ page, context }) => {
  await signAccount(context, fixture.accounts.manager); await page.setViewportSize({ width: 1512, height: 982 });
  await db.nhat_ky_hoat_dong.updateMany({ where: { company_id: fixture.companyId, account_id: fixture.accounts.manager.id, phan_he: 'AI', hanh_dong: { in: ['AI_REQUEST','AI_DONE'] } }, data: { created_at: new Date(Date.now()-600000) } });
  await page.goto('/?aiChat=new'); await expect(input(page)).toBeEnabled({ timeout: 30000 });
});
test.afterAll(()=>db.$disconnect());

test('AI inventory receive and issue preview, confirm and retain shared business behavior on desktop/mobile', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e=>errors.push(e.message));
  const before = await stock(); await prepare(page, 'TEST_INV RECEIVE'); expect(await stock()).toBe(before);
  await expect(panel(page)).toContainText('Nhập hàng'); await expect(panel(page)).toContainText(String(before+15));
  await page.screenshot({ path: 'outputs/ai-inventory/desktop-preview.png' });
  let dialog = await review(page); await expect(dialog.getByRole('spinbutton', { name: 'Số lượng', exact: true })).toHaveValue('15');
  await dialog.getByRole('button', { name: 'Xác nhận ghi nhận', exact: true }).click(); await expect(dialog).toBeHidden(); expect(await stock()).toBe(before+15);
  await expect(chat(page).getByRole('log')).toContainText('Đã ghi nhận giao dịch vật tư.');
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await prepare(page, 'TEST_INV ISSUE'); expect(await stock()).toBe(before+15);
  await expect(panel(page)).toContainText('Phòng Kinh doanh');
  dialog = await review(page); await expect(dialog.getByRole('spinbutton', { name: 'Số lượng', exact: true })).toHaveValue('2');
  await expect(dialog).toContainText('Phòng Kinh doanh'); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({ path: 'outputs/ai-inventory/mobile-confirm-dark.png' });
  await dialog.getByRole('button', { name: 'Xác nhận ghi nhận', exact: true }).click(); await expect(dialog).toBeHidden(); expect(await stock()).toBe(before+13); expect(errors).toEqual([]);
});

test('AI item form is prefilled and creates initial stock only after explicit save', async ({ page }) => {
  const before=await db.mat_hang_vat_tu.count({ where: { company_id: fixture.companyId } });
  await prepare(page, 'TEST_INV CREATE'); expect(await db.mat_hang_vat_tu.count({ where: { company_id: fixture.companyId } })).toBe(before);
  const dialog=await review(page); await expect(dialog.getByRole('textbox', { name: 'Tên mặt hàng', exact: true })).toHaveValue('Mực mới từ AI'); await expect(dialog.getByRole('spinbutton', { name: 'Số lượng ban đầu', exact: true })).toHaveValue('7');
  await dialog.getByRole('button', { name: 'Lưu mặt hàng', exact: true }).click(); await expect(dialog).toBeHidden();
  const row=await db.mat_hang_vat_tu.findFirstOrThrow({ where: { company_id: fixture.companyId, ten_mat_hang: 'Mực mới từ AI' }, orderBy: { id: 'desc' } });
  expect(row.don_vi_tinh).toBe('hộp'); expect(await db.giao_dich_vat_tu.count({ where: { mat_hang_vat_tu_id: row.id, so_luong: 7, loai_giao_dich: 'TON_DAU' } })).toBe(1);
});

test('stale preview retains filled form and requires refresh before confirming', async ({ page }) => {
  await prepare(page, 'TEST_INV RECEIVE'); const before=await stock(); const dialog=await review(page);
  await db.giao_dich_vat_tu.create({ data: { company_id: fixture.companyId, account_id: fixture.accounts.manager.id, mat_hang_vat_tu_id: fixture.itemId, loai_giao_dich: 'NHAP', so_luong: 1, request_id: randomUUID() } });
  await dialog.getByRole('button', { name: 'Xác nhận ghi nhận', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('Số dư hoặc mặt hàng đã thay đổi'); expect(await stock()).toBe(before+1);
  await expect(dialog.getByRole('spinbutton', { name: 'Số lượng', exact: true })).toHaveValue('15');
  await dialog.getByRole('button', { name: 'Cập nhật số dư', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('Đã cập nhật số dư');
  await dialog.getByRole('button', { name: 'Xác nhận ghi nhận', exact: true }).click(); await expect(dialog).toBeHidden(); expect(await stock()).toBe(before+16);
});

test('existing location draft still uses its original confirmation form', async ({ page }) => {
  const before = await db.vi_tri.count({ where: { company_id: fixture.companyId } });
  await prepare(page, 'Thêm vị trí thử dashboard');
  expect(await db.vi_tri.count({ where: { company_id: fixture.companyId } })).toBe(before);
  const dialog = await review(page);
  await expect(dialog.getByLabel('Tên vị trí', { exact: true })).toHaveValue('Vị trí thử dashboard');
  await dialog.getByRole('button', { name: 'Lưu vị trí', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(chat(page).getByRole('log')).toContainText('Đã lưu vị trí.');
  expect(await db.vi_tri.count({ where: { company_id: fixture.companyId } })).toBe(before + 1);
});
