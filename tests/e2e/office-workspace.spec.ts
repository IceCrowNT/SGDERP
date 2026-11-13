import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { readFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { signAccount } from '../helpers/account-fixture';
import { chooseRoomPoint } from '../helpers/office-3d';
import { HCNS_URL } from '../../src/lib/office-3d/building-navigation';
const db = new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL ?? ''), 'Isolated database required');
test.describe.configure({ mode: 'serial' });
let manager: { id: number; company_id: number; phien_ban_dang_nhap: number };
let person: { id: number; ho_ten: string }, asset: { id: number; ten_tai_san: string }, seat1: number;
const dir = 'outputs/ux-3d';
test.beforeAll(async () => {
 mkdirSync(dir, { recursive: true });
 const map = JSON.parse(readFileSync('var/office-3d/hcns.json', 'utf8'));
 seat1 = map.points.find((p: { key: string }) => p.key === 'hcns-01').locationId;
 const company_id = map.companyId, suffix = randomUUID();
 const permissions = await db.quyen.findMany({where: {phan_he: {in: ['LOCATIONS','HR','ASSETS']}, hanh_dong:'MANAGE', pham_vi:'ALL'}});
 expect(permissions).toHaveLength(3);
 const role = await db.vai_tro.create({data: {company_id, ma_vai_tro:`UX-${suffix}`,ten_vai_tro:'Kiểm thử 3D',danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
 manager = await db.tai_khoan.create({data:{company_id,ten_dang_nhap:`ux-${suffix}`,ten_hien_thi:'Kiểm thử không gian',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 const department = await db.phong_ban.findFirstOrThrow({where:{company_id}});
 person = await db.nhan_su.create({data:{company_id,department_id:department.id,ho_ten:`Nhân sự thử UX ${suffix.slice(0,5)}`,tinh_trang_lam_viec:'ACTIVE'}});
 const category = await db.loai_tai_san.create({data:{company_id,ma_loai:`UX_${Date.now()}`,ten_loai:'Máy tính để bàn'}});
 asset = await db.tai_san.create({data:{company_id,loai_tai_san_id:category.id,ten_tai_san:`PC thử UX ${suffix.slice(0,5)}`,tinh_trang:'BINH_THUONG'}});
});
test.afterAll(()=>db.$disconnect());
async function open(page: Page, context: Parameters<typeof signAccount>[0], url = HCNS_URL) {
 await signAccount(context, manager);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(url);
 await expect(page.locator('canvas[data-building-ready=true]')).toBeVisible({timeout:90000});
}
const workspace = (page: Page) => page.getByTestId('building-workspace');
async function expand(page: Page) {
 await page.getByRole('button',{name:'Mở rộng không gian 3D',exact:true}).click();
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
}
async function probe(page: Page) {
 await page.addInitScript(() => {
  const data = { view: [] as number[], projection: [] as number[], contexts:0 };
  (window as unknown as {probe:typeof data}).probe = data;
  const seen = new WeakSet(), names = new WeakMap();
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
   const gl = original.apply(this,args);
   if (gl && ['webgl','webgl2'].includes(args[0]) && !seen.has(gl)) { seen.add(gl); data.contexts++; }
   return gl;
  } as typeof original;
  for (const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]) {
   const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
   proto.getUniformLocation = function(program,name) { const loc=get.call(this,program,name); if(loc) names.set(loc,name); return loc; };
   proto.uniformMatrix4fv = function(this: WebGLRenderingContext | WebGL2RenderingContext, loc: WebGLUniformLocation | null, transpose: boolean, matrix: Float32List, srcOffset?: number, srcLength?: number) {
    const result = Reflect.apply(set,this,[loc,transpose,matrix,srcOffset,srcLength]);
    const vp=this.getParameter(this.VIEWPORT);
    if(vp[2]===this.drawingBufferWidth && vp[3]===this.drawingBufferHeight) {
     if(loc && names.get(loc)==='viewMatrix') data.view=Array.from(matrix);
     if(loc && names.get(loc)==='projectionMatrix') data.projection=Array.from(matrix);
    }
    return result;
   };
  }
 });
}
const pose = (page: Page) => page.evaluate(() => (window as unknown as {probe:{view:number[];projection:number[];contexts:number}}).probe);

test('expand, panel toggle and refresh keep one canvas, camera, selection and scroll', async ({page,context}) => {
 await page.setViewportSize({width:1600,height:900});
 await probe(page);
 let documents=0; const errors:string[]=[];
 page.on('request',r=>{if(r.resourceType()==='document')documents++;}); page.on('pageerror',e=>errors.push(e.message));
 await open(page,context,'/office-3d?floor=2&room=t2_hcns_pc');
 const original=await page.locator('canvas').elementHandle();
 await page.getByRole('button',{name:'Phóng to mô hình',exact:true}).click();
 const box=(await page.locator('canvas').boundingBox())!;
 await page.mouse.move(box.x+box.width*.45,box.y+box.height*.6);
 await page.mouse.down(); await page.mouse.move(box.x+box.width*.52,box.y+box.height*.62,{steps:8}); await page.mouse.up();
 await page.waitForTimeout(1500);
 await page.evaluate(()=>window.scrollTo({top:80,behavior:'instant'}));
 const before=await pose(page); expect(before.view).toHaveLength(16);
 const scroll=await page.evaluate(()=>scrollY); expect(scroll).toBeGreaterThan(0);
 for(let i=0;i<3;i++) {
  await expand(page);
  await expect(workspace(page)).toHaveAttribute('role','dialog');
  await page.getByRole('button',{name:'Ẩn bảng thông tin',exact:true}).click();
  await expect(page.locator('#building-information')).toBeHidden();
  await page.getByRole('button',{name:'Hiện bảng thông tin',exact:true}).click();
  await page.getByRole('button',{name:'Thu gọn không gian 3D',exact:true}).click();
 }
 await page.waitForTimeout(600);
 const after=await pose(page);
 after.view.forEach((v,i)=>expect(v).toBeCloseTo(before.view[i],3));
 after.projection.forEach((v,i)=>expect(v).toBeCloseTo(before.projection[i],3));
 expect(await page.evaluate(()=>scrollY)).toBe(scroll);
 await page.getByRole('button',{name:'Vào phòng',exact:true}).click();
 await chooseRoomPoint(page,'Vị trí 07');
 await expand(page);
 await page.getByRole('button',{name:'Thao tác không gian'}).click();
 await page.getByRole('menuitem',{name:'Cập nhật dữ liệu'}).click();
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
 await expect(page).toHaveURL(/point=hcns-07/);
 await expect(page.getByRole('region',{name:'Chi tiết vị trí'})).toContainText('Vị trí 07');
 expect(await original!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 expect((await pose(page)).contexts).toBe(1); expect(documents).toBe(1); expect(errors).toEqual([]);
 await page.screenshot({path:`${dir}/desktop-expanded.png`});
});

test('Escape respects overlays, traps focus, restores the trigger and releases background on navigation', async ({page,context}) => {
 await page.setViewportSize({width:1500,height:1000}); await open(page,context); await expand(page);
 const trigger=page.getByRole('button',{name:'Thu gọn không gian 3D'});
 await page.getByRole('button',{name:'Gán nhân sự',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'Gán nhân sự',exact:true}); await expect(picker).toBeVisible();
 await page.keyboard.press('Escape'); await expect(picker).toBeHidden();
 await expect(workspace(page)).toHaveAttribute('data-expanded','true'); await expect(page).toHaveURL(/mode=room/);
 await page.getByRole('button',{name:'Thao tác không gian'}).click(); await page.keyboard.press('Escape');
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
 await page.getByRole('button',{name:'Hướng dẫn thao tác 3D'}).click(); await page.keyboard.press('Escape');
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
 // Both Tab boundaries stay within the same working surface, including the panel.
 const focusable=workspace(page).locator('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]');
 const visible=await focusable.evaluateAll(els=>els.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.outerHTML));
 expect(visible.length).toBeGreaterThan(5);
 await workspace(page).evaluate(el=>{
  const nodes=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]')).filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  nodes.at(-1)!.focus();
 });
 await page.keyboard.press('Tab');
 expect(await workspace(page).evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Shift+Tab');
 expect(await workspace(page).evaluate(el=>el.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');
 await expect(workspace(page)).toHaveAttribute('data-expanded','false');
 await expect(page.getByRole('button',{name:'Mở rộng không gian 3D'})).toBeFocused();
 await expect(page).toHaveURL(/mode=room/);
 await page.keyboard.press('Escape'); await expect(page).not.toHaveURL(/mode=room/);
 await expand(page); await expect(trigger).toBeVisible();
 await page.getByRole('button',{name:'Thao tác không gian'}).click(); await page.getByRole('menuitem',{name:'Quản lý vị trí'}).click();
 await expect(page).toHaveURL(/\/locations/);
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 expect(await page.locator('[inert]').count()).toBe(0);
});

test('assign real employee and asset through dialogs above expanded viewer', async ({page,context})=>{
 await page.setViewportSize({width:1500,height:1000}); await open(page,context); await expand(page);
 const original=await page.locator('canvas').elementHandle();
 await page.getByRole('button',{name:'Gán nhân sự',exact:true}).click();
 await page.getByRole('textbox',{name:'Tìm nhân sự để gán'}).fill(person.ho_ten);
 await page.getByRole('button',{name:`Gán ${person.ho_ten}`,exact:true}).click();
 await expect(page.getByRole('region',{name:'Nhân sự tại vị trí'})).toContainText(person.ho_ten);
 expect((await db.nhan_su.findUniqueOrThrow({where:{id:person.id}})).vi_tri_lam_viec_id).toBe(seat1);
 await page.getByRole('button',{name:'Gán tài sản',exact:true}).click();
 await page.getByRole('textbox',{name:'Tìm tài sản để gán'}).fill(asset.ten_tai_san);
 await page.getByRole('button',{name:`Gán tài sản ${asset.ten_tai_san}`,exact:true}).click();
 await expect(page.getByRole('region',{name:'Tài sản tại vị trí'})).toContainText(asset.ten_tai_san);
 expect((await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(seat1);
 expect(await original!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
});

test('mobile and dark mode: compact controls, bottom panel and assignment dialog remain usable', async({page,context})=>{
 await page.setViewportSize({width:390,height:844}); await open(page,context);
 await expect(page.locator('#building-information')).toBeHidden();
 await expand(page);
 await page.getByRole('button',{name:'Hiện bảng thông tin'}).click();
 await chooseRoomPoint(page,'Vị trí 02');
 await expect(page.getByRole('region',{name:'Chi tiết vị trí'})).toContainText('Vị trí 02');
 const panel=(await page.locator('#building-information').boundingBox())!, model=(await page.locator('canvas').boundingBox())!;
 expect(model.y+model.height).toBeLessThanOrEqual(panel.y);
 await page.screenshot({path:`${dir}/mobile-expanded.png`});
 await page.getByRole('button',{name:'Gán tài sản',exact:true}).click();
 await page.getByRole('textbox',{name:'Tìm tài sản để gán'}).fill(asset.ten_tai_san);
 await page.getByRole('button',{name:`Gán tài sản ${asset.ten_tai_san}`,exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Chuyển vị trí tài sản?',exact:true})).toBeVisible();
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.waitForTimeout(400); // Let theme color transitions finish before visual review.
 await page.screenshot({path:`${dir}/mobile-dialog-dark.png`});
 await page.getByRole('button',{name:'Hủy',exact:true}).click();
 expect((await db.tai_san.findUniqueOrThrow({where:{id:asset.id}})).vi_tri_id).toBe(seat1);
 await expect(workspace(page)).toHaveAttribute('data-expanded','true');
 await page.getByRole('button',{name:'Đóng bảng thông tin'}).click();
 await page.getByRole('button',{name:'Mặt bằng',exact:true}).click();
 await page.screenshot({path:`${dir}/mobile-model-dark.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.setViewportSize({width:844,height:390});
 await page.getByRole('button',{name:'Hiện bảng thông tin'}).click();
 await expect(page.locator('canvas')).toBeVisible();
 await expect.poll(async()=>{
  const model=(await page.locator('canvas').boundingBox())!, panel=(await page.locator('#building-information').boundingBox())!;
  return model.height > 150 && model.x+model.width <= panel.x;
 }).toBe(true);
 await page.screenshot({path:`${dir}/mobile-landscape.png`});
 await page.setViewportSize({width:320,height:780});
 for(const name of ['Phối cảnh','Mặt bằng','Tập trung','Thu nhỏ mô hình','Phóng to mô hình','Đặt lại góc nhìn']) {
  const button=page.getByRole('button',{name,exact:true});
  await expect(button).toBeInViewport();
  const box=(await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(40);expect(box.height).toBeGreaterThanOrEqual(40);
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);
 }
 await page.keyboard.press('Escape');
 await expect(workspace(page)).toHaveAttribute('data-expanded','false');
});

test('WebGL loss opens an accessible list with usable model controls', async({page,context})=>{
 await page.setViewportSize({width:390,height:844}); await open(page,context); await expand(page);
 await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.getByRole('status').filter({hasText:'Không thể hiển thị 3D'})).toBeVisible();
 await expect(page.locator('#building-information')).toBeVisible();
 await chooseRoomPoint(page,'Vị trí 10');
 await expect(page.getByRole('region',{name:'Chi tiết vị trí'})).toContainText('Vị trí 10');
 await page.keyboard.press('Escape'); await expect(workspace(page)).toHaveAttribute('data-expanded','false');
});

test('expand while orbit is settling preserves its direction and room navigation', async ({page,context})=>{
 await page.setViewportSize({width:1500,height:1000}); await probe(page); await open(page,context);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(500);
 const original=await page.locator('canvas').elementHandle(), initial=await pose(page);
 const box=(await page.locator('canvas').boundingBox())!;
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.65);
 await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.65,{steps:5});await page.mouse.up();
 await expand(page);await page.waitForTimeout(1200);
 const settled=await pose(page);
 expect(Math.abs(settled.view[0]-initial.view[0])).toBeGreaterThan(.01);
 await page.getByRole('button',{name:'Thu gọn không gian 3D',exact:true}).click();await page.waitForTimeout(500);
 const returned=await pose(page);
 returned.view.forEach((v,i)=>expect(v).toBeCloseTo(settled.view[i],2));
 await expect(page).toHaveURL(/mode=room/);
 expect(await original!.evaluate(el=>el.isConnected&&el===document.querySelector('canvas'))).toBe(true);
 expect(returned.contexts).toBe(1);
});

test('desktop to mobile expansion keeps a fitted room and returns the original scale', async ({page,context})=>{
 await page.setViewportSize({width:1600,height:1100});await probe(page);
 await open(page,context,'/office-3d?floor=2&room=t2_hcns_pc');
 await expand(page);
 await page.getByRole('button',{name:'Vào phòng',exact:true}).click();
 await page.waitForTimeout(500);
 const before=await pose(page), original=(await page.locator('canvas').boundingBox())!;
 const zoom = (p:Awaited<ReturnType<typeof pose>>, width:number) => p.projection[0]*width/2;
 const beforeZoom=zoom(before,original.width);
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Đóng bảng thông tin'}).click();
 await expand(page);
 await page.getByRole('button',{name:'Hiện bảng thông tin'}).click();
 await page.waitForTimeout(600);
 const mobile=(await page.locator('canvas').boundingBox())!, data=await pose(page);
 // Same viewing direction; a much smaller viewport must not enlarge the room.
 expect(zoom(data,mobile.width)).toBeLessThan(beforeZoom*.6);
 await page.screenshot({path:`${dir}/mobile-after-desktop.png`});
 await page.setViewportSize({width:1600,height:1100});await page.waitForTimeout(600);
 const after=await pose(page);
 after.view.forEach((v,i)=>expect(v).toBeCloseTo(before.view[i],2));
 after.projection.forEach((v,i)=>expect(v).toBeCloseTo(before.projection[i],3));
});
