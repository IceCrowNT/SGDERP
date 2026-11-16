import {test,expect} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import {readFile} from "node:fs/promises";
import {signAccount} from "../helpers/account-fixture";
const db=new PrismaClient();
test.afterAll(()=>db.$disconnect());
async function account() {
  const {companyId}=JSON.parse(await readFile("var/office-3d/hcns.json","utf8"));
  return db.tai_khoan.findFirstOrThrow({where:{company_id:companyId,cho_phep_dang_nhap:true,bat_buoc_doi_mat_khau:false,
    AND:["LOCATIONS","ASSETS"].map(phan_he=>({danh_sach_vai_tro:{some:{vai_tro:{danh_sach_quyen:{some:{quyen:{phan_he,hanh_dong:{in:["VIEW","MANAGE"]}}}}}}}}))}});
}

test("compact toolbar fits one wide row, wraps without overlapping canvas, and retains one renderer",async({page,context})=>{
  await signAccount(context,await account());
  await page.setViewportSize({width:1600,height:1100});
  await page.emulateMedia({reducedMotion:"reduce"});
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/office-3d");
  const canvas=page.locator('canvas[data-building-ready=true]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  await expect(page.locator('#building-information')).toBeVisible();
  await expect(page.getByText(/3 tầng trong mô hình/)).toHaveCount(0);
  await expect(page.getByText('Về mô hình này',{exact:true})).toHaveCount(0);
  const floors=page.getByRole('group',{name:'Chọn tầng',exact:true});
  const search=page.getByRole('combobox',{name:'Tìm nhân sự hoặc tài sản',exact:true});
  const menu=page.getByRole('button',{name:'Thao tác không gian',exact:true});
  const searchBox=(await search.boundingBox())!, floorBox=(await floors.boundingBox())!, menuBox=(await menu.boundingBox())!;
  expect(Math.abs(searchBox.y-floorBox.y)).toBeLessThan(5);
  expect(Math.abs(menuBox.y-floorBox.y)).toBeLessThan(5);
  expect(searchBox.x).toBeGreaterThan(floorBox.x+floorBox.width);
  await page.getByTestId('building-workspace').screenshot({path:'outputs/compact-3d/desktop.png'});
  for(const width of [1280,390,320,1600]) {
    await page.setViewportSize({width,height:width<600?844:1100});
    await expect.poll(async()=>{
      const toolbar=(await page.getByTestId('scene-toolbar').boundingBox())!, model=(await canvas.boundingBox())!;
      return model.y>=toolbar.y+toolbar.height && model.height>180;
    }).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    for(const name of ['Hiển thị nhân sự','Hiển thị tài sản','Lọc loại tài sản','Thao tác không gian']) {
      const button=page.getByRole('button',{name,exact:true});
      const box=(await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.x+box.width).toBeLessThanOrEqual(width);
    }
    if(width===390) await page.getByTestId('building-workspace').screenshot({path:'outputs/compact-3d/mobile.png'});
  }
  await page.getByRole('button',{name:'Ẩn bảng thông tin',exact:true}).click();
  await expect(page.locator('#building-information')).toBeHidden();
  await page.getByRole('button',{name:'Hiện bảng thông tin',exact:true}).click();
  await expect(page.getByRole('region',{name:'Danh sách không gian',exact:true})).toBeVisible();
  await expect(page.getByText('Chọn không gian để xem nhân sự và tài sản.',{exact:true})).toHaveCount(0);
  await page.getByTestId('spaces-floor-2').locator('summary').click();
  const directory=page.getByRole('region',{name:'Danh sách không gian',exact:true});
  await expect(directory.getByRole('button',{name:/Xem không gian.*(?:WC|Vệ sinh|vệ sinh|Cầu thang|Thông tầng)/})).toHaveCount(0);
  await page.getByRole('button',{name:'Xem không gian Phòng Hành Chính Tổng Hợp, tầng 2',exact:true}).click();
  await expect(page.getByRole('region',{name:'Thông tin phòng',exact:true})).toBeVisible();
  await page.getByTestId('building-workspace').screenshot({path:'outputs/compact-3d/room-panel.png'});
  await floors.getByRole('button',{name:'Toàn tòa nhà',exact:true}).click();
  await expect(page.locator('#building-information')).toBeVisible();
  await page.getByRole('button',{name:'Mở rộng không gian 3D',exact:true}).click();
  await expect(page.getByTestId('building-workspace')).toHaveAttribute('data-expanded','true');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('building-workspace')).toHaveAttribute('data-expanded','false');
  expect(await original!.evaluate(el=>el===document.querySelector('canvas'))).toBe(true);
  expect(errors).toEqual([]);
});

test("asset search opens contextual details; WebGL failure opens the alternate directory",async({page,context})=>{
  const user=await account();
  const mapping=JSON.parse(await readFile("var/office-3d/hcns.json","utf8")) as {points:{locationId:number}[]};
  const asset=await db.tai_san.findFirstOrThrow({where:{company_id:user.company_id,vi_tri_id:{in:mapping.points.map(point=>point.locationId)}},select:{ma_tai_san:true,ten_tai_san:true}});
  await signAccount(context,user);
  await page.goto('/office-3d');
  const canvas=page.locator('canvas[data-building-ready=true]');
  await expect(canvas).toBeVisible({timeout:90000});
  await page.getByRole('combobox',{name:'Tìm nhân sự hoặc tài sản',exact:true}).fill(asset.ma_tai_san);
  await page.getByRole('option',{name:asset.ten_tai_san,exact:true}).click();
  await expect(page.locator('#building-information')).toBeVisible();
  await expect(page).toHaveURL(/asset=/);
  await page.getByRole('button',{name:'Trở lại tầng 2',exact:true}).click();
  await page.getByRole('group',{name:'Chọn tầng',exact:true}).getByRole('button',{name:'Toàn tòa nhà',exact:true}).click();
  await expect(page.locator('#building-information')).toBeVisible();
  await page.getByRole('button',{name:'Ẩn bảng thông tin',exact:true}).click();
  await expect(page.locator('#building-information')).toBeHidden();
  await canvas.evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.getByRole('region',{name:'Danh sách không gian',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Hướng dẫn thao tác 3D',exact:true}).click();
  await expect(page.getByText('Mặt bằng giản lược · Nội thất theo khảo sát, kích thước ước lượng.',{exact:true})).toBeVisible();
});
