import { test, expect, type Page, type Request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Matrix4, Vector4 } from "three";
import { signAccount } from "../helpers/account-fixture";
import { BUILDING_ROOMS, HCNS_BUILDING_KEY } from "../../src/lib/office-3d/building-layout";
import { placementError } from "../../src/lib/office-3d/placement";
const db=new PrismaClient();
test.skip(!/\/sdg_assets_test_\d+(\?|$)/.test(process.env.DATABASE_URL??""),"Isolated database required");
test.describe.configure({mode:"serial"});
type Account={id:number;company_id:number;phien_ban_dang_nhap:number};
let manager:Account, reader:Account, locationManager:Account, foreign:Account;
let company:number,roomId:number,objectId:number,locationId:number,assetId:number,savedRequest:Request;
const run=randomUUID().slice(0,7),name=`Bàn thử ${run}`,assetName=`PC bố trí ${run}`;
const room=BUILDING_ROOMS.find(r=>r.key===HCNS_BUILDING_KEY)!;
const url=`/office-3d?floor=2&room=${room.key}`;
const point=(()=>{for(let z=-4;z<6;z+=.5) for(let x=-3;x<4;x+=.5) if(!placementError(room.key,{kind:"BAN",x,z,angle:0}))return{x,z};throw Error("No free point");})();
const form=(page:Page)=>page.getByRole("form",{name:"Bố trí vị trí trên 3D"});
test.beforeAll(async()=>{
  mkdirSync("outputs/3d-placement",{recursive:true});
  const map=JSON.parse(readFileSync("var/office-3d/hcns.json","utf8"));company=map.companyId;roomId=map.roomId;
  async function account(level:string,assets=false,company_id=company) {
    const permissions=await db.quyen.findMany({where:{pham_vi:"ALL",OR:[{phan_he:"LOCATIONS",hanh_dong:level},...(assets?[{phan_he:"ASSETS",hanh_dong:"MANAGE"}]:[])]}});
    const role=await db.vai_tro.create({data:{company_id,ma_vai_tro:`PLACE-${randomUUID()}`,ten_vai_tro:"Thử bố trí",danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
    return db.tai_khoan.create({data:{company_id,ten_dang_nhap:`place-${randomUUID()}`,ten_hien_thi:"Thử bố trí",mat_khau_bam:"disabled",danh_sach_vai_tro:{create:{role_id:role.id}}}});
  }
  manager=await account("MANAGE",true);reader=await account("VIEW");locationManager=await account("MANAGE");
  const other=await db.cong_ty.create({data:{ten_cong_ty:`Bố trí khác ${run}`}});foreign=await account("MANAGE",false,other.id);
  const category=await db.loai_tai_san.create({data:{company_id:company,ma_loai:`PC_${run.toUpperCase()}`,ten_loai:"Máy tính để bàn"}});
  assetId=(await db.tai_san.create({data:{company_id:company,loai_tai_san_id:category.id,ten_tai_san:assetName,tinh_trang:"BINH_THUONG"}})).id;
});
test.afterAll(async()=>{
  const rows=await db.vat_the_3d.findMany({where:{company_id:company,vi_tri:{ten_vi_tri:{contains:run}}}});
  const ids=rows.map(r=>r.vi_tri_id);
  await db.tai_san.updateMany({where:{company_id:company,vi_tri_id:{in:ids}},data:{vi_tri_id:null}});
  await db.vi_tri.deleteMany({where:{id:{in:ids},company_id:company}});
  await db.$disconnect();
});
async function probe(page:Page) {
  await page.addInitScript(()=>{
    const w=window as unknown as {placementProbe:{view:number[];projection:number[]}};w.placementProbe={view:[],projection:[]};
    const names=new WeakMap<WebGLUniformLocation,string>();
    for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]) {
      const get=proto.getUniformLocation,set=proto.uniformMatrix4fv;
      proto.getUniformLocation=function(program,name){const loc=get.call(this,program,name);if(loc)names.set(loc,name);return loc;};
      proto.uniformMatrix4fv=function(loc:WebGLUniformLocation|null,transpose:boolean,data:Float32List){const result=set.call(this,loc,transpose,data);const vp=this.getParameter(this.VIEWPORT);
        if(vp[2]===this.drawingBufferWidth&&vp[3]===this.drawingBufferHeight&&loc){if(names.get(loc)==="viewMatrix")w.placementProbe.view=Array.from(data);if(names.get(loc)==="projectionMatrix")w.placementProbe.projection=Array.from(data);}return result;};
    }
  });
}
async function open(page:Page) {
  await page.emulateMedia({reducedMotion:"reduce"});await page.goto(url);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({timeout:90000});
  if(await page.locator("#building-information").isHidden()) await page.getByRole("button",{name:"Hiện bảng thông tin",exact:true}).click();
}
async function clickPosition(page:Page,x:number,z:number) {
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {placementProbe:{view:number[]}}).placementProbe.view.length)).toBe(16);
  const data=await page.evaluate(()=>(window as unknown as {placementProbe:{view:number[];projection:number[]}}).placementProbe);
  const v=new Vector4(room.x+x,3.28,room.z+z,1).applyMatrix4(new Matrix4().fromArray(data.view)).applyMatrix4(new Matrix4().fromArray(data.projection));
  const b=(await page.locator("canvas").boundingBox())!;
  await page.mouse.click(b.x+(v.x/v.w+1)*b.width/2,b.y+(1-v.y/v.w)*b.height/2);
}
async function post(page:Page,payload:unknown){return(await page.request.post("/office-3d",{headers:{"Next-Action":savedRequest.headers()["next-action"],"Content-Type":"text/plain;charset=UTF-8"},data:JSON.stringify([payload])})).text();}
test("place desk on actual Canvas, save real location, assign asset, edit and reload without remount",async({page,context})=>{
  await page.setViewportSize({width:1500,height:1050});await probe(page);await signAccount(context,manager);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await open(page);
  const canvas=await page.locator("canvas").elementHandle();
  await page.getByRole("button",{name:"Thêm vị trí",exact:true}).click();await form(page).getByLabel("Tên vị trí").fill(name);
  // Wait for the requested top-down camera before projecting the floor point.
  await expect.poll(async()=>{const p=await page.evaluate(()=>(window as unknown as {placementProbe:{view:number[]}}).placementProbe);return Math.abs(p.view[5]??1);}).toBeLessThan(.01);
  await clickPosition(page,point.x,point.z);await expect(form(page)).toContainText("Đã chọn điểm đặt");
  await page.screenshot({path:"outputs/3d-placement/desk-preview.png",fullPage:true});
  const request=page.waitForRequest(r=>Boolean(r.headers()["next-action"])&&(r.postData()??"").includes('"roomKey"'));
  await form(page).getByRole("button",{name:"Lưu vị trí",exact:true}).click();savedRequest=await request;
  await expect(form(page)).toHaveCount(0);
  const object=await db.vat_the_3d.findFirstOrThrow({where:{company_id:company,vi_tri:{ten_vi_tri:name}},include:{vi_tri:true}});
  objectId=object.id;locationId=object.vi_tri_id;
  expect(object.vi_tri.parent_id).toBe(roomId);expect(object.vi_tri.loai_vi_tri).toBe("CHO_NGOI");
  expect(object.toa_do_x).toBeCloseTo(point.x,1);expect(object.toa_do_z).toBeCloseTo(point.z,1);
  await expect(page.getByRole("region",{name:"Chi tiết vị trí",exact:true})).toContainText(name);
  await page.getByRole("button",{name:"Gán tài sản",exact:true}).click();await page.getByRole("textbox",{name:"Tìm tài sản để gán"}).fill(assetName);
  await page.getByRole("button",{name:`Gán tài sản ${assetName}`,exact:true}).click();
  await expect.poll(async()=>(await db.tai_san.findUniqueOrThrow({where:{id:assetId}})).vi_tri_id).toBe(locationId);
  await expect(page.getByRole("region",{name:"Tài sản tại vị trí",exact:true})).toContainText(assetName);
  await page.getByRole("button",{name:"Chỉnh bố trí",exact:true}).click();await form(page).getByRole("button",{name:"Dịch xuống",exact:true}).click();
  await form(page).getByRole("button",{name:"Lưu vị trí",exact:true}).click();await expect(form(page)).toHaveCount(0);
  expect((await db.vat_the_3d.findUniqueOrThrow({where:{id:objectId}})).vi_tri_id).toBe(locationId);
  expect(await canvas!.evaluate(el=>el===document.querySelector("canvas")&&el.isConnected)).toBe(true);
  expect(await db.nhat_ky_hoat_dong.count({where:{account_id:manager.id,doi_tuong_id:`vi_tri:${locationId}`,phan_he:"LOCATIONS"}})).toBe(2);
  await page.screenshot({path:"outputs/3d-placement/desk-with-asset.png",fullPage:true});
  await page.reload();await expect(page.getByRole("region",{name:"Tài sản tại vị trí",exact:true})).toContainText(assetName);expect(errors).toEqual([]);
});
test("server enforces permission, tenant, collision, optimistic lock and concurrent placement",async({page,context})=>{
  await signAccount(context,manager);await open(page);
  const before=await db.vat_the_3d.findUniqueOrThrow({where:{id:objectId},include:{vi_tri:true}});
  const base={roomKey:room.key,roomId,name:`Chồng ${run}`,kind:"BAN",x:before.toa_do_x,z:before.toa_do_z,angle:0};
  const count=await db.vi_tri.count();
  expect(await post(page,base)).toContain("trùng");
  expect(await post(page,{...base,x:99})).toContain("bên trong phòng");
  expect(await post(page,{...base,roomId:roomId+9999})).toContain("Phòng đã thay đổi");
  expect(await post(page,{...base,id:objectId,version:new Date(0).toISOString(),locationVersion:before.vi_tri.updated_at.toISOString()})).toContain("đã được cập nhật");
  await signAccount(context,reader);expect(await post(page,base)).toContain("không có quyền");await open(page);await expect(page.getByRole("button",{name:"Thêm vị trí",exact:true})).toHaveCount(0);
  await signAccount(context,foreign);expect(await post(page,base)).toContain("không thuộc công ty");
  expect(await db.vi_tri.count()).toBe(count);
  await signAccount(context,manager);
  const shapes=[{kind:"BAN" as const,x:before.toa_do_x,z:before.toa_do_z,angle:0 as const}];
  let empty:{x:number;z:number}|undefined;
  for(let z=-4;z<6&&!empty;z+=.5)for(let x=-3;x<4;x+=.5)if(!placementError(room.key,{kind:"DIEM",x,z,angle:0},shapes)){empty={x,z};break;}
  expect(empty).toBeDefined();
  const payload={...base,...empty,kind:"DIEM",name:`Điểm đồng thời ${run}`};
  const responses=await Promise.all([post(page,payload),post(page,payload)]);
  expect(responses.filter(r=>r.includes('"success":true'))).toHaveLength(1);
  const created=await db.vat_the_3d.findFirstOrThrow({where:{vi_tri:{ten_vi_tri:payload.name}},include:{vi_tri:true}});
  expect(created.vi_tri.loai_vi_tri).toBe("DIEM_DAT_THIET_BI");
  await db.vi_tri.delete({where:{id:created.vi_tri_id}});expect(await db.vat_the_3d.count({where:{id:created.id}})).toBe(0);
});
test("mobile placement cancel is read-only; editing conflict retains draft; location management grants no asset access",async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await signAccount(context,locationManager);await open(page);
  const count=await db.vi_tri.count();
  await page.getByRole("button",{name:"Thêm vị trí",exact:true}).click();await form(page).getByLabel("Tên vị trí").fill(`Hủy ${run}`);
  await form(page).getByRole("button",{name:"Điểm thiết bị",exact:true}).click();await form(page).getByRole("button",{name:"Đặt giữa phòng",exact:true}).click();
  await page.screenshot({path:"outputs/3d-placement/mobile-point-preview.png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await form(page).getByRole("button",{name:"Hủy",exact:true}).click();expect(await db.vi_tri.count()).toBe(count);
  await page.goto(`${url}&point=object-${objectId}`);
  if(await page.locator("#building-information").isHidden())await page.getByRole("button",{name:"Hiện bảng thông tin",exact:true}).click();
  await expect(page.getByRole("region",{name:"Chi tiết vị trí",exact:true})).toContainText(name);
  await expect(page.getByRole("button",{name:"Gán tài sản",exact:true})).toHaveCount(0);expect(await page.content()).not.toContain(assetName);
  await page.getByRole("button",{name:"Chỉnh bố trí",exact:true}).click();await form(page).getByLabel("Tên vị trí").fill(`${name} đang sửa`);
  await db.vi_tri.update({where:{id:locationId},data:{mo_ta:"Thay đổi từ danh mục"}});
  await form(page).getByRole("button",{name:"Lưu vị trí",exact:true}).click();await expect(form(page).getByRole("alert")).toContainText("đã được cập nhật");
  await expect(form(page).getByLabel("Tên vị trí")).toHaveValue(`${name} đang sửa`);
});
test("ordinary mapped room supports equipment anchors and refresh; unmapped rooms cannot add",async({page,context})=>{
  await page.setViewportSize({width:1400,height:1000});await signAccount(context,manager);await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/office-3d?floor=1&room=t1_kd");
  await page.getByRole("button",{name:"Thêm vị trí",exact:true}).click();await form(page).getByLabel("Tên vị trí").fill(`Điểm KD ${run}`);
  await form(page).getByRole("button",{name:"Điểm thiết bị",exact:true}).click();await form(page).getByRole("button",{name:"Đặt giữa phòng",exact:true}).click();
  await form(page).getByRole("button",{name:"Xoay 90°",exact:true}).click();
  await form(page).getByRole("button",{name:"Lưu vị trí",exact:true}).click();await expect(form(page)).toHaveCount(0);
  const point=await db.vat_the_3d.findFirstOrThrow({where:{vi_tri:{ten_vi_tri:`Điểm KD ${run}`}},include:{vi_tri:true}});
  expect(point.goc_xoay).toBe(90);expect(point.vi_tri.loai_vi_tri).toBe("DIEM_DAT_THIET_BI");
  await page.reload();await expect(page.getByRole("region",{name:"Chi tiết vị trí",exact:true})).toContainText(`Điểm KD ${run}`);
  await page.screenshot({path:"outputs/3d-placement/other-room-point.png",fullPage:true});
  await page.goto("/office-3d?floor=2&room=plan_t2_trai_sau");await expect(page.getByRole("button",{name:"Thêm vị trí",exact:true})).toHaveCount(0);
});
