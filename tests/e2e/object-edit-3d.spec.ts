import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Matrix4, Vector4 } from "three";
import { signAccount } from "../helpers/account-fixture";
import {layoutEquipment} from "../../src/lib/office-3d/equipment-layout";
import { HCNS_LAYOUT } from "../../src/lib/office-3d/hcns-layout";
import { hcnsWorldPoint } from "../../src/lib/office-3d/building-navigation";
const db = new PrismaClient(), map = JSON.parse(readFileSync("var/office-3d/hcns.json", "utf8"));
const base = "/office-3d?floor=2&room=t2_hcns_pc&mode=room", run = randomUUID().slice(0,8);
const seat = map.points.find((p: {key:string}) => p.key === "hcns-04").locationId;
type Account = {id:number;company_id:number;phien_ban_dang_nhap:number};
let manager:Account, viewer:Account, hr:Account, assets:Account, person:number, asset:number, second:number, foreignPerson:number;
const menu = (p:Page) => p.getByRole("menu", {name:"Thao tác trên mô hình"});
const dialog = (p:Page,name:string) => p.getByRole("dialog", {name,exact:true});
test.beforeAll(async()=>{
  if(!new URL(process.env.DATABASE_URL!).pathname.includes("_test_")) throw Error("Isolated DB required");
  async function account(levels:Record<string,string>,suffix:string) {
    const permissions=await db.quyen.findMany({where:{OR:Object.entries(levels).map(([phan_he,hanh_dong])=>({phan_he,hanh_dong,pham_vi:"ALL"}))}});
    const role=await db.vai_tro.create({data:{company_id:map.companyId,ma_vai_tro:`OBJ-${suffix}-${run}`,ten_vai_tro:suffix,danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
    return db.tai_khoan.create({data:{company_id:map.companyId,ten_dang_nhap:`obj-${suffix}-${run}`,ten_hien_thi:suffix,mat_khau_bam:"disabled",danh_sach_vai_tro:{create:{role_id:role.id}}}});
  }
  manager=await account({LOCATIONS:"MANAGE",HR:"MANAGE",ASSETS:"MANAGE"},"manager");
  viewer=await account({LOCATIONS:"VIEW",HR:"VIEW",ASSETS:"VIEW"},"viewer");
  hr=await account({LOCATIONS:"VIEW",HR:"MANAGE"},"hr");assets=await account({LOCATIONS:"VIEW",ASSETS:"MANAGE"},"assets");
  const other=await db.cong_ty.create({data:{ten_cong_ty:`Object other ${run}`}});
  foreignPerson=(await db.nhan_su.create({data:{company_id:other.id,ho_ten:"Không tiết lộ khác công ty"}})).id;
  const department=await db.phong_ban.findFirstOrThrow({where:{company_id:map.companyId}});
  person=(await db.nhan_su.create({data:{company_id:map.companyId,department_id:department.id,ho_ten:`Người sửa 3D ${run}`,tinh_trang_lam_viec:"ACTIVE"}})).id;
  const cat=await db.loai_tai_san.findFirstOrThrow({where:{company_id:map.companyId,ma_loai:"PRN"}});
  for(const n of [1,2]) {const a=await db.tai_san.create({data:{company_id:map.companyId,loai_tai_san_id:cat.id,ten_tai_san:`Máy in thử ${n} ${run}`}});if(n===1)asset=a.id;else second=a.id;}
});
test.beforeEach(async()=>{
  await db.nhan_su.updateMany({where:{company_id:map.companyId,vi_tri_lam_viec_id:seat},data:{vi_tri_lam_viec_id:null}});
  await db.tai_san.updateMany({where:{company_id:map.companyId,vi_tri_id:seat},data:{vi_tri_id:null}});
  await db.nhan_su.update({where:{id:person},data:{ho_ten:`Người sửa 3D ${run}`,vi_tri_lam_viec_id:seat}});
  await db.tai_san.update({where:{id:asset},data:{ten_tai_san:`Máy in thử 1 ${run}`,vi_tri_id:seat}});
});
test.afterAll(()=>db.$disconnect());
async function open(page:Page,context:Parameters<typeof signAccount>[0],actor=manager) {
  await page.setViewportSize({width:1600,height:1100});await page.emulateMedia({reducedMotion:"reduce"});
  await page.addInitScript(()=>{
    const target=window as unknown as {sceneProbe:{view:number[];projection:number[]}};target.sceneProbe={view:[],projection:[]};
    const names=new WeakMap<WebGLUniformLocation,string>();
    for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]) {
      const get=proto.getUniformLocation,set=proto.uniformMatrix4fv;
      proto.getUniformLocation=function(program,name){const loc=get.call(this,program,name);if(loc)names.set(loc,name);return loc;};
      proto.uniformMatrix4fv=function(loc:WebGLUniformLocation|null,transpose:boolean,data:Float32List){const result=set.call(this,loc,transpose,data),vp=this.getParameter(this.VIEWPORT);if(loc&&vp[2]===this.drawingBufferWidth&&vp[3]===this.drawingBufferHeight){if(names.get(loc)==="viewMatrix")target.sceneProbe.view=Array.from(data);if(names.get(loc)==="projectionMatrix")target.sceneProbe.projection=Array.from(data);}return result;};
    }
  });
  await signAccount(context,actor);await page.goto(base+"&point=hcns-04");await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({timeout:90000});
}
async function rightMesh(page:Page,xOffset?:number,zOffset=0,height=1.1,assetId=asset) {
  if(xOffset===undefined) {
    const records=await db.tai_san.findMany({where:{company_id:map.companyId,vi_tri_id:seat},include:{loai_tai_san:true}});
    const d=HCNS_LAYOUT.find(p=>p.key==="hcns-04")!;
    const placed=layoutEquipment({equipment:[],width:d.width,depth:d.depth,assets:records.map(a=>({id:a.id,code:a.ma_tai_san,name:a.ten_tai_san,category:a.loai_tai_san.ten_loai,categoryCode:a.loai_tai_san.ma_loai,condition:a.tinh_trang,locationId:seat,version:""}))}).find(p=>p.assetId===assetId && p.part==="device")!;
    [xOffset,,zOffset]=placed.position;height=placed.position[1]+.2;
  }
  const people=page.getByRole("button",{name:"Hiển thị nhân sự",exact:true});
  if(await people.count() && await people.getAttribute("aria-pressed")==="true") await people.click();
  await page.getByRole("button",{name:"Mặt bằng",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Math.abs((window as unknown as {sceneProbe:{view:number[]}}).sceneProbe.view[5]??1))).toBeLessThan(.01);
  const m=await page.evaluate(()=>(window as unknown as {sceneProbe:{view:number[];projection:number[]}}).sceneProbe);
  const desk=HCNS_LAYOUT.find(p=>p.key==="hcns-04")!,v=new Vector4(...hcnsWorldPoint(desk.x+xOffset,height,desk.z+zOffset),1).applyMatrix4(new Matrix4().fromArray(m.view)).applyMatrix4(new Matrix4().fromArray(m.projection));
  const box=(await page.locator("canvas").boundingBox())!;
  await page.mouse.click(box.x+(v.x/v.w+1)*box.width/2,box.y+(1-v.y/v.w)*box.height/2,{button:"right"});await expect(menu(page)).toBeVisible();
}
async function toolbar(page:Page,label:string){await page.getByRole("button",{name:"Thao tác không gian",exact:true}).click();await page.getByRole("menuitem",{name:label,exact:true}).click();}

test("right-click actual equipment edits the exact asset inline and keeps Canvas, URL and audit",async({page,context})=>{
  await open(page,context);await rightMesh(page);
  await expect(menu(page)).toContainText(`Máy in thử 1 ${run}`);
  await expect(menu(page).getByRole("menuitem",{name:"Sửa thông tin vị trí",exact:true})).toHaveCount(0);
  const canvas=await page.locator("canvas").elementHandle(),url=page.url();
  const camera=await page.evaluate(()=>(window as unknown as {sceneProbe:{view:number[]}}).sceneProbe.view);
  await menu(page).getByRole("menuitem",{name:"Sửa tài sản",exact:true}).click();
  const edit=dialog(page,"Sửa tài sản");await edit.getByRole("button",{name:"Sửa tên tài sản",exact:true}).click();
  await edit.getByLabel("Tên tài sản",{exact:false}).fill(`Máy in đã sửa ${run}`);
  await edit.getByLabel("Tên tài sản",{exact:false}).press("Enter");await expect(edit.getByRole("heading",{name:`Máy in đã sửa ${run}`,exact:true})).toBeVisible();
  await edit.getByRole("button",{name:"Close",exact:true}).click();
  await expect(page.locator("#building-information")).toContainText(`Máy in đã sửa ${run}`);expect(page.url()).toBe(url);
  expect(await canvas!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
  const after=await page.evaluate(()=>(window as unknown as {sceneProbe:{view:number[]}}).sceneProbe.view);after.forEach((v,i)=>expect(v).toBeCloseTo(camera[i],3));
  expect(await db.nhat_ky_hoat_dong.count({where:{account_id:manager.id,phan_he:"ASSETS",doi_tuong_id:`tai_san:${asset}`}})).toBeGreaterThan(0);
  await toolbar(page,"Sửa tài sản");await expect(dialog(page,"Sửa tài sản")).toBeVisible();
});
test("right-click person uses HR editor; draft survives Escape/network and save updates scene",async({page,context})=>{
  await open(page,context);await page.getByRole("button",{name:`Xem nhân sự Người sửa 3D ${run}`,exact:true}).click({button:"right"});
  await expect(menu(page)).toContainText(`Người sửa 3D ${run}`);await menu(page).getByRole("menuitem",{name:"Sửa nhân sự",exact:true}).click();
  const edit=dialog(page,"Sửa nhân sự");await edit.getByLabel("Họ và tên",{exact:false}).fill(`Người đã sửa ${run}`);
  await page.keyboard.press("Escape");await expect(edit).toBeVisible();
  const block=async(route:import("@playwright/test").Route)=>route.request().method()==="POST"?route.abort():route.continue();
  await page.route("**/office-3d**",block);await edit.getByRole("button",{name:"Lưu hồ sơ",exact:true}).click();
  await expect(page.getByText("Không kết nối được máy chủ. Nội dung đang sửa vẫn được giữ.",{exact:true})).toBeVisible();await expect(edit.getByLabel("Họ và tên",{exact:false})).toHaveValue(`Người đã sửa ${run}`);
  await page.unroute("**/office-3d**",block);await edit.getByRole("button",{name:"Lưu hồ sơ",exact:true}).click();await expect(edit).toHaveCount(0);
  await expect(page.getByRole("button",{name:`Xem nhân sự Người đã sửa ${run}`,exact:true})).toBeVisible();
  expect((await db.nhan_su.findUniqueOrThrow({where:{id:person}})).vi_tri_lam_viec_id).toBe(seat);
  expect(await db.nhat_ky_hoat_dong.count({where:{account_id:manager.id,phan_he:"HR"}})).toBeGreaterThan(0);
});
test("desk menu edits location; duplicate types select exact records; legacy groups still choose a dossier",async({page,context})=>{
  await open(page,context);await rightMesh(page,.45,.3,.82);
  await menu(page).getByRole("menuitem",{name:"Sửa thông tin vị trí",exact:true}).click();
  const edit=dialog(page,"Sửa thông tin vị trí");await edit.getByLabel("Mô tả / hướng dẫn tìm").fill(`Ghi chú ${run}`);await edit.getByRole("button",{name:"Lưu vị trí",exact:true}).click();await expect(edit).toHaveCount(0);
  expect((await db.vi_tri.findUniqueOrThrow({where:{id:seat}})).mo_ta).toBe(`Ghi chú ${run}`);
  await db.tai_san.update({where:{id:second},data:{vi_tri_id:seat}});await page.reload();await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible();await rightMesh(page,undefined,0,1.1,second);
  await expect(page).toHaveURL(new RegExp(`asset=${second}(?:&|$)`));
  await expect(menu(page)).toContainText(`Máy in thử 2 ${run}`);
  await page.keyboard.press("Escape");
  // Legacy grouped deep links still allow choosing a record explicitly.
  await page.goto(base+"&point=hcns-04&equipment=printer");
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible();
  await toolbar(page,"Sửa tài sản");
  const assetEdit=dialog(page,"Sửa tài sản");await expect(assetEdit.getByText("Hình này đại diện nhiều tài sản. Chọn hồ sơ cần sửa.")).toBeVisible();
  await assetEdit.getByLabel("Tìm tài sản cần sửa").fill("Máy in thử 2");await assetEdit.getByRole("button",{name:new RegExp(`Máy in thử 2 ${run}`)}).click();
  await expect(assetEdit.getByRole("heading",{name:`Máy in thử 2 ${run}`,exact:true})).toBeVisible();
  await assetEdit.getByRole("button",{name:"Close",exact:true}).click();await page.locator("canvas").click({position:{x:8,y:8},button:"right"});
  await expect(menu(page).getByRole("menuitem",{name:/^Sửa/})).toHaveCount(0);
});
test("rights stay independent; denied HR read cannot disclose a dossier; mobile dark editor works via toolbar",async({page,context})=>{
  await open(page,context,viewer);await page.getByRole("button",{name:`Xem nhân sự Người sửa 3D ${run}`,exact:true}).click({button:"right"});await expect(menu(page).getByRole("menuitem",{name:/^Sửa/})).toHaveCount(0);await page.keyboard.press("Escape");
  await open(page,context,hr);let read:Request|undefined;page.on("request",r=>{if(r.headers()["next-action"]&&r.postData()===`[${person}]`)read=r;});
  await page.getByRole("button",{name:`Xem nhân sự Người sửa 3D ${run}`,exact:true}).click();await toolbar(page,"Sửa nhân sự");await expect(dialog(page,"Sửa nhân sự").getByLabel("Họ và tên",{exact:false})).toBeVisible();expect(read).toBeTruthy();
  const foreign=await page.request.post(new URL(read!.url()).pathname,{headers:{"Next-Action":read!.headers()["next-action"],"Content-Type":read!.headers()["content-type"]},data:JSON.stringify([foreignPerson])});const foreignText=await foreign.text();expect(foreignText).toContain("Không tìm thấy nhân sự");expect(foreignText).not.toContain("Không tiết lộ khác công ty");
  await signAccount(context,viewer);const denied=await page.request.post(new URL(read!.url()).pathname,{headers:{"Next-Action":read!.headers()["next-action"],"Content-Type":read!.headers()["content-type"]},data:JSON.stringify([person])});expect(await denied.text()).toContain("Không có quyền sửa nhân sự");
  await open(page,context,assets);await rightMesh(page);await expect(menu(page).getByRole("menuitem",{name:"Sửa tài sản",exact:true})).toBeVisible();await page.keyboard.press("Escape");
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add("dark"));await toolbar(page,"Sửa tài sản");
  const edit=dialog(page,"Sửa tài sản");await edit.getByRole("button",{name:"Sửa tên tài sản",exact:true}).click();await expect(edit.getByLabel("Tên tài sản",{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:"outputs/3d-object-edit/mobile-dark.png"});await edit.getByRole("button",{name:"Đóng",exact:true}).click();await expect(edit.getByRole("textbox",{name:"Tên tài sản",exact:true})).toHaveCount(0);
});
