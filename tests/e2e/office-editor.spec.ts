import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { signAccount } from '../helpers/account-fixture';
const f=JSON.parse(readFileSync('outputs/office-20261123/fixture.json','utf8'));
test.beforeAll(()=>expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(/^\/sdg_tasks_test_\d+$/));
test('desktop opens document alongside chat, protects edits, saves through callback and keeps new file on reload',async({page,context})=>{
 test.setTimeout(120000);await signAccount(context,f.owner);await page.setViewportSize({width:1600,height:1000});await page.goto(`/?aiChat=${f.chatId}`);
 const chat=page.getByRole('region',{name:'Trợ lý AI',exact:true});await expect(chat.getByRole('button',{name:'Bao-gia.docx',exact:true})).toBeVisible();await chat.getByRole('button',{name:'Bao-gia.docx',exact:true}).click();
 const panel=page.getByRole('complementary',{name:'Tài liệu cạnh chat'});await expect(panel).toBeVisible();const content=panel.getByRole('textbox',{name:'Office document content'});await expect(content).toBeVisible({timeout:60000});
 await content.fill('Số lượng: 10 lọ');await expect(panel.getByRole('button',{name:'Đóng tài liệu'})).toBeDisabled();await expect(chat.getByRole('button',{name:'Chat mới',exact:true})).toBeDisabled();
 await page.getByRole('link',{name:'Hồ sơ của tôi',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Lưu bản mới trước khi rời cuộc chat.');await expect(content).toHaveValue('Số lượng: 10 lọ');
 const divider = chat.getByRole('separator', { name: 'Điều chỉnh độ rộng khung chat' });
 const initialWidth = (await panel.boundingBox())!.width;
 await divider.focus();
 await page.keyboard.press('ArrowRight');
 await expect(divider).toHaveAttribute('aria-valuenow', '40');
 expect((await panel.boundingBox())!.width).toBeLessThan(initialWidth);
 const handle = (await divider.boundingBox())!;
 await page.mouse.move(handle.x + handle.width / 2, handle.y + 30);
 await page.mouse.down();
 await page.mouse.move(handle.x + 180, handle.y + 30, { steps: 5 });
 await page.mouse.up();
 expect(Number(await divider.getAttribute('aria-valuenow'))).toBeGreaterThan(40);
 const originalHeight = (await panel.boundingBox())!.height;
 await panel.getByRole('button',{name:'Mở rộng bảng'}).click();await expect(content).toHaveValue('Số lượng: 10 lọ');expect((await panel.boundingBox())!.height).toBeGreaterThan(originalHeight);await panel.getByRole('button',{name:'Thu nhỏ bảng'}).click();
 await panel.getByRole('button',{name:'Lưu bản mới'}).click();await expect(panel.getByText('Đã lưu bản mới vào cuộc chat.')).toBeVisible({timeout:30000});await expect(panel.getByRole('button',{name:'Đóng tài liệu'})).toBeEnabled();
 await page.screenshot({path:'outputs/office-20261123/desktop.png'});await panel.getByRole('button',{name:'Đóng tài liệu'}).click();await expect(panel).toHaveCount(0);await page.reload();await expect(chat.getByRole('button',{name:/Bao-gia - đã sửa.docx/}).first()).toBeVisible();
});
test('mobile switches between conversation and document, read-only preview and no page overflow',async({page,context})=>{
 test.setTimeout(90000);await signAccount(context,f.owner);await page.setViewportSize({width:390,height:844});await page.goto(`/?aiChat=${f.chatId}`);
 const chat=page.getByRole('region',{name:'Trợ lý AI',exact:true});await chat.getByRole('button',{name:'Bao-gia.docx',exact:true}).click();const panel=page.getByRole('complementary',{name:'Tài liệu cạnh chat'});
 await expect(panel.getByText('Bản xem trước',{exact:true})).toBeVisible({timeout:60000});await expect(panel.getByRole('button',{name:'Lưu bản mới'})).toHaveCount(0);
 await chat.getByRole('button',{name:'Trao đổi',exact:true}).click();await expect(panel).toBeHidden();await chat.getByRole('button',{name:'Tài liệu',exact:true}).click();await expect(panel).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'outputs/office-20261123/mobile.png'});
});
test('unavailable Office keeps the file downloadable and panel closable',async({page,context})=>{
 test.setTimeout(60000);await signAccount(context,f.owner);await page.route('**/web-apps/apps/api/documents/api.js',route=>route.abort());await page.goto(`/?aiChat=${f.chatId}`);
 const chat=page.getByRole('region',{name:'Trợ lý AI',exact:true});await chat.getByRole('button',{name:'Bao-gia.docx',exact:true}).click();const panel=page.getByRole('complementary',{name:'Tài liệu cạnh chat'});
 await expect(panel.getByRole('alert')).toContainText('Không kết nối được trình soạn thảo');await expect(panel.getByRole('link',{name:'Tải bản đã lưu'})).toBeVisible();await panel.getByRole('button',{name:'Đóng tài liệu'}).click();await expect(panel).toHaveCount(0);
});

test('long chat keeps its reading position across older pages and returns to the latest message', async ({page,context}) => {
  const db = new PrismaClient();
  const conversation = await db.hoi_thoai_ai.create({ data: {
    company_id: f.owner.company_id, account_id: f.owner.id, tieu_de: 'Kiểm tra cuộn hội thoại',
    danh_sach_tin_nhan: { createMany: { data: Array.from({length: 85}, (_, i) => ({
      ma_yeu_cau: randomUUID(), vai_tro: 'NGUOI_DUNG', trang_thai: 'HOAN_TAT', noi_dung: `Tin thử số ${i + 1}`,
    })) } },
  } });
  try {
    await signAccount(context, f.owner);
    await page.setViewportSize({ width: 1366, height: 700 });
    await page.goto(`/?aiChat=${conversation.id}`);
    const log = page.getByRole('log');
    await expect(log.getByText('Tin thử số 85', {exact: true})).toBeInViewport();
    await log.evaluate(el => { el.scrollTop = 0; });
    const first = log.getByText('Tin thử số 46', {exact: true});
    const before = (await first.boundingBox())!.y;
    await log.getByRole('button', {name: 'Xem tin nhắn trước'}).click();
    await expect(log.getByText('Tin thử số 6', {exact: true})).toBeAttached();
    expect(Math.abs((await first.boundingBox())!.y - before)).toBeLessThan(3);
    await log.evaluate(el => { el.scrollTop = 0; });
    await log.getByRole('button', {name: 'Xem tin nhắn trước'}).click();
    await expect(log.getByText('Tin thử số 1', {exact: true})).toBeAttached();
    const position = await log.evaluate(el => el.scrollTop);
    await page.getByRole('button', {name:'Thao tác cuộc chat',exact:true}).click();
    const refreshed = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('aiChat='));
    await page.getByRole('menuitem', {name:'Tải lại hội thoại'}).click();
    await refreshed;
    await expect(page.getByRole('button', {name:'Chat mới',exact:true})).toBeEnabled();
    await expect(log.getByText('Tin thử số 1', {exact: true})).toBeAttached();
    expect(await log.evaluate(el => el.scrollTop)).toBe(position);
    await page.getByRole('button', {name: 'Đến tin nhắn mới nhất'}).click();
    await expect(log.getByText('Tin thử số 85', {exact: true})).toBeInViewport();
    await expect(page.getByRole('button', {name:'Gửi yêu cầu',exact:true})).toBeInViewport();
  } finally {
    await db.hoi_thoai_ai.delete({where:{id:conversation.id}});
    await db.$disconnect();
  }
});
