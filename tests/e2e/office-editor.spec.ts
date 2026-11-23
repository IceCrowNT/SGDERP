import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signAccount } from '../helpers/account-fixture';
const f=JSON.parse(readFileSync('outputs/office-20261123/fixture.json','utf8'));
test.beforeAll(()=>expect(new URL(process.env.DATABASE_URL!).pathname).toMatch(/^\/sdg_tasks_test_\d+$/));
test('desktop opens document alongside chat, protects edits, saves through callback and keeps new file on reload',async({page,context})=>{
 test.setTimeout(120000);await signAccount(context,f.owner);await page.setViewportSize({width:1600,height:1000});await page.goto(`/?aiChat=${f.chatId}`);
 const chat=page.getByRole('region',{name:'Trợ lý AI',exact:true});await expect(chat.getByRole('button',{name:'Bao-gia.docx',exact:true})).toBeVisible();await chat.getByRole('button',{name:'Bao-gia.docx',exact:true}).click();
 const panel=page.getByRole('complementary',{name:'Tài liệu cạnh chat'});await expect(panel).toBeVisible();const content=panel.getByRole('textbox',{name:'Office document content'});await expect(content).toBeVisible({timeout:60000});
 await content.fill('Số lượng: 10 lọ');await expect(panel.getByRole('button',{name:'Đóng tài liệu'})).toBeDisabled();await expect(chat.getByRole('button',{name:'Chat mới',exact:true})).toBeDisabled();
 await page.getByRole('link',{name:'Hồ sơ của tôi',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Lưu bản mới trước khi rời cuộc chat.');await expect(content).toHaveValue('Số lượng: 10 lọ');
 await panel.getByRole('button',{name:'Mở rộng bảng'}).click();await expect(content).toHaveValue('Số lượng: 10 lọ');await panel.getByRole('button',{name:'Thu nhỏ bảng'}).click();
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
