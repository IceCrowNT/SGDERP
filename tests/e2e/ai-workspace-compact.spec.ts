import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'node:fs';
import { signAccount } from '../helpers/account-fixture';
test.skip(!/^\/sdg_ai_dashboard_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/none').pathname), 'Isolated database only');
test.setTimeout(90000);
const db=new PrismaClient();
const fixture=process.env.AI_DASHBOARD_FIXTURE?JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE,'utf8')):{};
const chat=(p:Page)=>p.getByRole('region',{name:'Trợ lý AI',exact:true});
const input=(p:Page)=>chat(p).getByRole('textbox',{name:'Yêu cầu AI'});
async function send(p:Page,text:string){await input(p).fill(text);await chat(p).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(input(p)).toHaveValue('',{timeout:30000});}
async function rename(p:Page){await chat(p).getByRole('button',{name:'Thao tác cuộc chat',exact:true}).click();await p.getByRole('menuitem',{name:'Đổi tên',exact:true}).click();return p.getByRole('dialog',{name:'Đổi tên cuộc trò chuyện',exact:true});}
test.beforeEach(async({page,context})=>{await db.tep_dinh_kem_ai.deleteMany({where:{company_id:fixture.companyId,account_id:fixture.accounts.manager.id,hoi_thoai_id:null}});await db.nhat_ky_hoat_dong.updateMany({where:{company_id:fixture.companyId,account_id:fixture.accounts.manager.id,phan_he:'AI',hanh_dong:{in:['AI_REQUEST','AI_DONE']}},data:{created_at:new Date(Date.now()-600000)}});await signAccount(context,fixture.accounts.manager);await page.setViewportSize({width:1512,height:982});await page.goto('/?aiChat=new');await expect(input(page)).toBeEnabled({timeout:25000});});
test.afterAll(()=>db.$disconnect());
test('compact layout grows composer, keeps file and tab context on desktop and mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await send(page,'TEST_DOCUMENT WORD');
 const conversationId=Number(new URL(page.url()).searchParams.get('aiChat'));
 await db.tin_nhan_ai.updateMany({where:{hoi_thoai_id:conversationId,vai_tro:'TRO_LY'},data:{noi_dung:Array.from({length:10},(_,i)=>`**Mục ${i+1}: Kiểm tra tài liệu bàn giao**\nDanh sách tài sản được đối chiếu theo phòng ban và vị trí sử dụng. Nội dung cần đọc rõ, có khoảng cách giữa các đoạn và giữ liên kết tới tệp kết quả.`).join('\n\n')}});
 await page.reload();await expect(input(page)).toBeEnabled();
 const metrics=await chat(page).evaluate(el=>({chat:el.getBoundingClientRect().height,composer:el.querySelector('form')!.getBoundingClientRect().height,log:el.querySelector('[role=log]')!.getBoundingClientRect().height,top:el.getBoundingClientRect().top}));
 expect(metrics.composer).toBeLessThan(150);expect(metrics.log/metrics.chat).toBeGreaterThan(.7);expect(metrics.top).toBeLessThan(180);
 writeFileSync('outputs/ai-workspace-compact/metrics-desktop.json',JSON.stringify(metrics,null,2));
 await input(page).fill('Nội dung đang soạn');
 await chat(page).getByRole('log').evaluate(el=>{el.scrollTop=200;});
 const scrollBefore=await chat(page).getByRole('log').evaluate(el=>el.scrollTop);
 await chat(page).getByRole('button',{name:'Tệp trong cuộc chat (1)',exact:true}).click();await expect(chat(page).getByRole('region',{name:'Tệp trong cuộc chat',exact:true}).getByRole('link')).toBeVisible();
 await chat(page).getByRole('button',{name:'Tệp trong cuộc chat (1)',exact:true}).click();await expect(input(page)).toHaveValue('Nội dung đang soạn');expect(await chat(page).getByRole('log').evaluate(el=>el.scrollTop)).toBe(scrollBefore);
 const small=(await input(page).boundingBox())!.height;await input(page).fill(Array.from({length:16},(_,i)=>`Dòng ${i}`).join('\n'));expect((await input(page).boundingBox())!.height).toBeGreaterThan(small);
 await page.getByRole('tab',{name:'Việc của tôi',exact:true}).click();await page.getByRole('tab',{name:'Trợ lý AI',exact:true}).click();expect(await input(page).inputValue()).toContain('Dòng 15');
 await input(page).fill('Tiếp tục soạn tài liệu');await page.screenshot({path:'outputs/ai-workspace-compact/desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const sendButton=chat(page).getByRole('button',{name:'Gửi yêu cầu',exact:true});const box=await sendButton.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(40);expect(box!.y+box!.height).toBeLessThanOrEqual(844);
 await chat(page).getByRole('button',{name:'Định dạng và giới hạn tệp'}).click();await expect(page.getByText(/Tối đa 10 MiB\/tệp, 3 tệp/)).toBeVisible();await page.keyboard.press('Escape');await expect(input(page)).toHaveValue('Tiếp tục soạn tài liệu');
 await page.screenshot({path:'outputs/ai-workspace-compact/mobile-dark.png'});expect(errors).toEqual([]);
});
test('rename persists without reordering or losing composer; archive is per conversation',async({page})=>{
 await send(page,'Cuộc trao đổi có tên dài cần đặt lại cho dễ nhận biết');const id=Number(new URL(page.url()).searchParams.get('aiChat'));const before=await db.hoi_thoai_ai.findUniqueOrThrow({where:{id}});
 await input(page).fill('Bản đang soạn');const dialog=await rename(page);await dialog.getByRole('textbox',{name:'Tên cuộc trò chuyện'}).fill('Biên bản bàn giao');await dialog.getByRole('button',{name:'Lưu tên',exact:true}).click();await expect(dialog).toBeHidden();
 await expect(input(page)).toHaveValue('Bản đang soạn');await expect(chat(page).getByRole('heading',{name:'Biên bản bàn giao',exact:true})).toBeVisible();
 const after=await db.hoi_thoai_ai.findUniqueOrThrow({where:{id}});expect(after.tieu_de).toBe('Biên bản bàn giao');expect(after.updated_at).toEqual(before.updated_at);
 const history=page.getByRole('complementary',{name:'Lịch sử hội thoại',exact:true});await expect(history.getByRole('heading',{name:'Hôm nay'})).toBeVisible();await expect(history.getByText(new Date(after.updated_at).toLocaleString('vi-VN'),{exact:true})).toHaveCount(0);
 await history.getByRole('button',{name:'Thao tác: Biên bản bàn giao',exact:true}).click();await page.getByRole('menuitem',{name:'Lưu trữ chat',exact:true}).click();await expect(input(page)).toBeDisabled();await expect(input(page)).toHaveValue('Bản đang soạn');
 await chat(page).getByRole('button',{name:'Khôi phục để chat tiếp'}).click();await expect(input(page)).toBeEnabled();await expect(input(page)).toHaveValue('Bản đang soạn');await page.reload();await expect(chat(page).getByRole('heading',{name:'Biên bản bàn giao',exact:true})).toBeVisible();
});
test('rename rejects stale title and a forged foreign conversation id',async({page})=>{
 await send(page,'Hội thoại thử quyền đổi tên');const id=Number(new URL(page.url()).searchParams.get('aiChat'));const other=await db.hoi_thoai_ai.create({data:{company_id:fixture.companyId,account_id:fixture.accounts.none.id,tieu_de:'Hội thoại khác'}});
 const dialog=await rename(page);await dialog.getByRole('textbox',{name:'Tên cuộc trò chuyện'}).fill('Không được ghi');
 let tampered=false;await page.route('**/*',async route=>{const b=route.request().postData()??'';if(!tampered&&b.includes('expectedTitle')){tampered=true;return route.continue({postData:b.replace(`"id":${id}`,`"id":${other.id}`)});}return route.continue();});
 await dialog.getByRole('button',{name:'Lưu tên',exact:true}).click();await expect(dialog.getByRole('alert')).toBeVisible();expect((await db.hoi_thoai_ai.findUniqueOrThrow({where:{id:other.id}})).tieu_de).toBe('Hội thoại khác');await page.unrouteAll({behavior:'wait'});
 await db.hoi_thoai_ai.update({where:{id},data:{tieu_de:'Tên đã sửa ở phiên khác'}});await dialog.getByRole('button',{name:'Lưu tên',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Tên hội thoại đã thay đổi');await expect(dialog.getByRole('textbox',{name:'Tên cuộc trò chuyện'})).toHaveValue('Không được ghi');
 expect((await db.hoi_thoai_ai.findUniqueOrThrow({where:{id}})).tieu_de).toBe('Tên đã sửa ở phiên khác');expect(tampered).toBe(true);
});
