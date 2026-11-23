import {test,expect,type Request} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {signAccount} from '../helpers/account-fixture';
const db=new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL??''),'Isolated DB only');
test.afterAll(()=>db.$disconnect());
test('KHDT asset assignment, confirmed move, detach, stale and permission checks',async({page,context})=>{
 const run=randomUUID().slice(0,8);
 const room=await db.vi_tri.findFirstOrThrow({where:{ten_vi_tri:'Phòng Kế hoạch Đầu tư',loai_vi_tri:'PHONG'}});
 const points=await db.vat_the_3d.findMany({where:{phong_id:room.id},include:{vi_tri:true},orderBy:{id:'asc'}});expect(points.length).toBeGreaterThanOrEqual(2);
 async function account(level:'MANAGE'|'VIEW',company=room.company_id){
  const permissions=await db.quyen.findMany({where:{pham_vi:'ALL',OR:[{phan_he:'LOCATIONS',hanh_dong:'VIEW'},{phan_he:'ASSETS',hanh_dong:level}]}});
  const role=await db.vai_tro.create({data:{company_id:company,ma_vai_tro:`ROOM-${randomUUID()}`,ten_vai_tro:'Room test',danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
  return db.tai_khoan.create({data:{company_id:company,ten_dang_nhap:`room-${randomUUID()}`,ten_hien_thi:'Room test',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 }
 const manager=await account('MANAGE'), reader=await account('VIEW');
 const category=await db.loai_tai_san.findFirstOrThrow({where:{company_id:room.company_id,ma_loai:'PC'}});
 const asset=await db.tai_san.create({data:{company_id:room.company_id,loai_tai_san_id:category.id,ten_tai_san:`PC KHDT ${run}`,tinh_trang:'BINH_THUONG'}});
 const url=(id:number)=>`/office-3d?floor=2&room=plan_t2_phai_truoc&mode=room&point=object-${id}`;
 await signAccount(context,manager);await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url(points[0].id));await expect(page.locator('canvas[data-building-ready=true]')).toBeVisible({timeout:90000});
 const canvas=await page.locator('canvas').elementHandle();
 async function pick(){await page.getByRole('button',{name:'Gán tài sản',exact:true}).click();await page.getByRole('textbox',{name:'Tìm tài sản để gán'}).fill(asset.ten_tai_san);await page.getByRole('button',{name:`Gán tài sản ${asset.ten_tai_san}`,exact:true}).click();}
 const requestPromise=page.waitForRequest(r=>Boolean(r.headers()['next-action'])&&(r.postData()??'').includes('"assetId"'));
 await pick();const request:Request=await requestPromise;
 await expect.poll(async()=>(await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(points[0].vi_tri_id);
 await expect(page.getByRole('region',{name:'Tài sản tại vị trí',exact:true})).toContainText(asset.ten_tai_san);
 expect(await canvas!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 // Use in-view navigation, not a new document/Canvas.
 await page.locator('summary').filter({hasText:'Danh sách vị trí'}).click();
 await page.getByRole('button',{name:`Chọn ${points[1].vi_tri.ten_vi_tri}`,exact:true}).click();
 await pick();await expect(page.getByRole('dialog',{name:'Chuyển vị trí tài sản?'})).toBeVisible();
 expect((await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(points[0].vi_tri_id);
 await page.getByRole('button',{name:'Xác nhận chuyển tài sản',exact:true}).click();
 await expect.poll(async()=>(await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(points[1].vi_tri_id);
 const panel=page.getByRole('region',{name:'Tài sản tại vị trí',exact:true});
 const row=panel.locator('li').filter({hasText:asset.ten_tai_san});await row.getByRole('button',{name:'Bỏ gán tài sản',exact:true}).click();
 await page.getByRole('button',{name:'Xác nhận bỏ gán tài sản',exact:true}).click();
 await expect.poll(async()=>(await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(null);
 expect(await canvas!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 const latest=await db.tai_san.findUniqueOrThrow({where:{id:asset.id}});
 async function post(version=latest.updated_at.toISOString(),locationId=points[0].vi_tri_id){return(await page.request.post('/office-3d',{headers:{'Next-Action':request.headers()['next-action'],'Content-Type':'text/plain;charset=UTF-8'},data:JSON.stringify([{assetId:asset.id,locationId,version,confirmMove:true}])})).text();}
 expect(await post(new Date(0).toISOString())).toContain('STALE');
 await signAccount(context,reader);expect(await post()).toContain('chưa được cấp quyền tài sản');
 await page.reload();await expect(page.getByRole('button',{name:'Gán tài sản',exact:true})).toHaveCount(0);
 const other=await db.cong_ty.create({data:{ten_cong_ty:`Other room ${run}`}});const foreign=await account('MANAGE',other.id);
 await signAccount(context,foreign);expect(await post()).not.toContain('"success":true');
 expect((await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(null);
 expect(await db.nhat_ky_hoat_dong.count({where:{account_id:manager.id,phan_he:'ASSETS'}})).toBe(3);
});
