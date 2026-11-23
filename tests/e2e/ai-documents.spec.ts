import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { signAccount } from '../helpers/account-fixture';
test.skip(!/^\/sdg_ai_dashboard_test_\d+$/.test(new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/none').pathname), 'Isolated DB only');
test.setTimeout(120000);
const db=new PrismaClient();
const fixture=process.env.AI_DASHBOARD_FIXTURE?JSON.parse(readFileSync(process.env.AI_DASHBOARD_FIXTURE,'utf8')):{};
const chat=(p:Page)=>p.getByRole('region',{name:'Trợ lý AI',exact:true});
const input=(p:Page)=>chat(p).getByRole('textbox',{name:'Yêu cầu AI'});
async function send(p:Page,message:string){await expect(input(p)).toBeEnabled();await input(p).fill(message);await chat(p).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(input(p)).toHaveValue('',{timeout:60000});}
async function files(p:Page){return db.tep_dinh_kem_ai.findMany({where:{hoi_thoai_id:Number(new URL(p.url()).searchParams.get('aiChat'))},orderBy:{id:'asc'}});}
test.beforeEach(async({page,context})=>{await db.nhat_ky_hoat_dong.updateMany({where:{company_id:fixture.companyId,account_id:fixture.accounts.manager.id,phan_he:'AI',hanh_dong:{in:['AI_REQUEST','AI_DONE']}},data:{created_at:new Date(Date.now()-600000)}});await signAccount(context,fixture.accounts.manager);await page.goto('/?aiChat=new');await expect(input(page)).toBeEnabled();});
test.afterAll(()=>db.$disconnect());
test('create Word, export real PDF, reload private results',async({page,context})=>{
 await send(page,'TEST_DOCUMENT WORD');await expect(chat(page).getByRole('log')).toContainText('Tệp kết quả');
 const original=(await files(page))[0];expect(original.loai_tep).toBe('docx');const bytes=await (await page.request.get(`/media/ai-attachments/${original.id}`)).body();expect(bytes.subarray(0,2).toString()).toBe('PK');
 await send(page,'TEST_DOCUMENT CONVERT');const rows=await files(page);expect(rows).toHaveLength(2);expect(rows[1].loai_tep).toBe('pdf');
 const pdf=await (await page.request.get(`/media/ai-attachments/${rows[1].id}`)).body();expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0);
 await page.reload();await expect(input(page)).toBeEnabled();await expect(chat(page).getByRole('link',{name:/exported.pdf/})).toBeVisible();
 expect(await (await page.request.get(`/media/ai-attachments/${original.id}`)).body()).toEqual(bytes);
 await page.screenshot({path:'outputs/ai-document-tools/chat-documents.png'});
 await signAccount(context,fixture.accounts.none);expect((await page.request.get(`/media/ai-attachments/${rows[1].id}`)).status()).toBe(404);
});
test('Excel follow-up edits produce a new version and retry creates no duplicate',async({page})=>{
 await send(page,'TEST_DOCUMENT SHEET');const original=(await files(page))[0];
 let aborted=false;await page.route('**/*',async route=>{if(!aborted&&route.request().method()==='POST'&&route.request().postData()?.includes('TEST_DOCUMENT EDIT')){aborted=true;await route.fetch();return route.abort('failed');}return route.continue();});
 await input(page).fill('TEST_DOCUMENT EDIT');await chat(page).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(chat(page).getByRole('alert')).toContainText('Mất kết nối',{timeout:60000});
 await chat(page).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(input(page)).toHaveValue('',{timeout:30000});
 const rows=await files(page);expect(rows).toHaveLength(2);
 const read=async(id:number)=>XLSX.read(await (await page.request.get(`/media/ai-attachments/${id}`)).body()).Sheets['Tài sản'].B2.v;
 expect(await read(original.id)).toBe(100);expect(await read(rows[1].id)).toBe(150);
});
test('uploaded PDF form is filled in Vietnamese, preserving source',async({page})=>{
 const pdf=await PDFDocument.create(),p=pdf.addPage();pdf.getForm().createTextField('name').addToPage(p);const bytes=Buffer.from(await pdf.save());
 await chat(page).getByLabel('Chọn tệp đính kèm',{exact:true}).setInputFiles({name:'form.pdf',buffer:bytes,mimeType:'application/pdf'});await expect(chat(page).getByRole('button',{name:'Bỏ tệp form.pdf',exact:true})).toBeEnabled({timeout:30000});
 await send(page,'TEST_DOCUMENT PDF_FORM');const rows=await files(page);expect(rows).toHaveLength(2);
 const result=await PDFDocument.load(await (await page.request.get(`/media/ai-attachments/${rows[1].id}`)).body());expect(result.getForm().getTextField('name').getText()).toBe('Nguyễn Văn Nam');expect(await (await page.request.get(`/media/ai-attachments/${rows[0].id}`)).body()).toEqual(bytes);
});
test('result survives final model failure and reload',async({page})=>{
 await input(page).fill('TEST_DOCUMENT FAIL_FINAL');await chat(page).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(chat(page).getByRole('alert')).toBeVisible({timeout:60000});
 const rows=await files(page);expect(rows).toHaveLength(1);const answer=await db.tin_nhan_ai.findUniqueOrThrow({where:{id:rows[0].tin_nhan_id!}});expect(answer.trang_thai).toBe('LOI');expect(JSON.stringify(answer.du_lieu_kem_theo)).toContain('files');
 await page.reload();await expect(chat(page).getByRole('link',{name:/generated.docx/})).toBeVisible();
});
test('lookup refuses document write tools',async({page})=>{
 await chat(page).getByRole('combobox',{name:'Tác vụ AI'}).click();await page.getByRole('option',{name:'Tra cứu dữ liệu',exact:true}).click();
 await input(page).fill('TEST_DOCUMENT WORD');await chat(page).getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await expect(chat(page).getByRole('alert')).toContainText('Công cụ này không được phép',{timeout:30000});expect(await files(page)).toHaveLength(0);
});
