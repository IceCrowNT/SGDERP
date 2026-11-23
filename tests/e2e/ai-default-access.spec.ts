import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { signAccount } from '../helpers/account-fixture';

test.skip(!/^\/sdg_ai_governance_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/none').pathname), 'Isolated database and mocked provider required');
test.setTimeout(90000);
const db = new PrismaClient();
const fixture = process.env.AI_DASHBOARD_FIXTURE ? JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE, 'utf8')) : {};
test.afterAll(() => db.$disconnect());

test('DEFAULT sees chatbot, generates personal documents, resumes history and cannot view administration', async ({ page, context }) => {
  await signAccount(context, fixture.accounts.none);
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.goto('/?aiChat=new');
  const chat = page.getByRole('region', { name: 'Trợ lý AI', exact: true });
  const input = chat.getByRole('textbox', { name: 'Yêu cầu AI' });
  await expect(input).toBeEnabled({ timeout: 30000 });
  const send = async (message: string) => {
    await input.fill(message);
    await chat.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
    await expect(input).toHaveValue('', { timeout: 45000 });
    await expect(input).toBeEnabled();
  };
  await send('Xin chào, tôi cần soạn tài liệu cá nhân');
  const id = Number(new URL(page.url()).searchParams.get('aiChat'));
  expect(id).toBeGreaterThan(0);
  await send('TEST_DOCUMENT WORD');
  await send('TEST_DOCUMENT SHEET');
  const files = await db.tep_dinh_kem_ai.findMany({ where: { hoi_thoai_id: id, account_id: fixture.accounts.none.id }, orderBy: { id: 'asc' } });
  expect(files.map(f => f.loai_tep)).toEqual(['docx', 'xlsx']);
  for (const file of files) {
    const response = await page.request.get(`/media/ai-attachments/${file.id}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).subarray(0, 2).toString()).toBe('PK');
  }
  await page.reload(); await expect(input).toBeEnabled();
  await send('Cảm ơn, tiếp tục trao đổi');
  expect(Number(new URL(page.url()).searchParams.get('aiChat'))).toBe(id);
  expect(await db.vai_tro_quyen.count({ where: { vai_tro: { company_id: fixture.companyId, ma_vai_tro: 'DEFAULT' } } })).toBe(0);
  await page.screenshot({ path: 'outputs/ai-default/default-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(input).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'outputs/ai-default/default-mobile.png' });
  await page.goto('/settings/ai');
  await expect(page.getByRole('heading', { name: 'Quản trị AI', exact: true })).toHaveCount(0);
  // Even a company administrator cannot download another account's personal files.
  await signAccount(context, fixture.accounts.manager);
  expect((await page.request.get(`/media/ai-attachments/${files[0].id}`)).status()).toBe(404);
});
