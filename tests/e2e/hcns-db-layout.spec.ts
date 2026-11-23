import {test,expect} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {signAccount} from '../helpers/account-fixture';
const db=new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL??''),'Isolated database required');
test.afterAll(()=>db.$disconnect());
test('original HCNS desk can be repositioned through the shared editor without changing dimensions or assignments',async({page,context})=>{
 const account=await db.tai_khoan.findFirstOrThrow({where:{cho_phep_dang_nhap:true,bat_buoc_doi_mat_khau:false,
  danh_sach_vai_tro:{some:{vai_tro:{danh_sach_quyen:{some:{quyen:{phan_he:'LOCATIONS',hanh_dong:'MANAGE'}}}}}}}});
 const desk=await db.vat_the_3d.findFirstOrThrow({where:{company_id:account.company_id,khoa_cu:'hcns-01'}});
 const links=async()=>({people:await db.nhan_su.findMany({where:{company_id:account.company_id},select:{id:true,vi_tri_lam_viec_id:true},orderBy:{id:'asc'}}),assets:await db.tai_san.findMany({where:{company_id:account.company_id},select:{id:true,vi_tri_id:true},orderBy:{id:'asc'}})});
 const before=await links();await signAccount(context,account);
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/office-3d?floor=2&room=t2_hcns_pc&mode=room&point=hcns-01');
 await expect(page.locator('canvas[data-building-ready=true]')).toBeVisible({timeout:90000});
 const original=await page.locator('canvas').elementHandle();
 for(const direction of ['Dịch trái','Dịch phải']){
  await page.getByRole('button',{name:'Thao tác không gian',exact:true}).click();
  await page.getByRole('menuitem',{name:'Chỉnh bố trí',exact:true}).click();
  const form=page.getByRole('form',{name:'Bố trí vị trí trên 3D'});
  await form.getByRole('button',{name:direction,exact:true}).click();
  await form.getByRole('button',{name:'Lưu vị trí',exact:true}).click();
  await expect(form).toHaveCount(0);
  const after=await db.vat_the_3d.findUniqueOrThrow({where:{id:desk.id}});
  expect(after.toa_do_x).toBeCloseTo(desk.toa_do_x+(direction==='Dịch trái'?-.2:0));
  expect([after.vi_tri_id,after.chieu_rong,after.chieu_sau,after.goc_xoay,after.khoa_cu]).toEqual([desk.vi_tri_id,desk.chieu_rong,desk.chieu_sau,desk.goc_xoay,desk.khoa_cu]);
  expect(await links()).toEqual(before);
  await expect(page).toHaveURL(/point=hcns-01/);
 }
 expect(await original!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 await page.reload();await expect(page.getByRole('region',{name:'Chi tiết vị trí',exact:true})).toBeVisible();
 await expect(page.locator('canvas[data-building-ready=true]')).toBeVisible({timeout:90000});
 await page.screenshot({path:'outputs/hcns-db/edited-desk.png'});
});
