import {test, expect, type Page} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import {readFile, writeFile} from "node:fs/promises";
import {Matrix4,Vector4} from "three";
import {signAccount} from "../helpers/account-fixture";
import {HCNS_LAYOUT, equipmentForAssets} from "../../src/lib/office-3d/hcns-layout";
import {layoutEquipment} from "../../src/lib/office-3d/equipment-layout";
import type {LocationAsset} from "../../src/lib/asset-location";
import {hcnsWorldPoint} from "../../src/lib/office-3d/building-navigation";
const db = new PrismaClient();
test.afterAll(()=>db.$disconnect());
async function setup(page:Page) {
  await page.addInitScript(() => {
    const target = window as unknown as { sceneProbe: { view: number[]; projection: number[]; updates: number; heights: number[] } };
    target.sceneProbe = { view: [], projection: [], updates: 0, heights: [] };
    const names = new WeakMap<WebGLUniformLocation, string>();
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
      proto.getUniformLocation = function(program, name) { const loc = get.call(this, program, name); if (loc) names.set(loc, name); return loc; };
      proto.uniformMatrix4fv = function(loc: WebGLUniformLocation | null, transpose: boolean, data: Float32List) {
        target.sceneProbe.updates++;
        const result = set.call(this, loc, transpose, data), vp = this.getParameter(this.VIEWPORT);
        if (loc && vp[2] === this.drawingBufferWidth && vp[3] === this.drawingBufferHeight) {
          if (names.get(loc) === "modelMatrix") {
            const height = Math.round(data[13] * 10000) / 10000;
            if (!target.sceneProbe.heights.includes(height)) target.sceneProbe.heights.push(height);
          }
          if (names.get(loc) === "viewMatrix") target.sceneProbe.view = Array.from(data);
          if (names.get(loc) === "projectionMatrix") target.sceneProbe.projection = Array.from(data);
        }
        return result;
      };
    }
  });
}
async function projection(page:Page) {
  return page.evaluate(()=>(window as unknown as {sceneProbe:{view:number[];projection:number[];updates:number;heights:number[]}}).sceneProbe);
}
async function pixel(page:Page,x:number,y:number,z:number) {
  const matrices=await projection(page);
  const v=new Vector4(...hcnsWorldPoint(x,y,z),1).applyMatrix4(new Matrix4().fromArray(matrices.view)).applyMatrix4(new Matrix4().fromArray(matrices.projection));
  const box=(await page.locator("canvas").boundingBox())!;
  return {x:box.x+(v.x/v.w+1)*box.width/2,y:box.y+(1-v.y/v.w)*box.height/2};
}
async function data(pointKey="hcns-07") {
  const mapping=JSON.parse(await readFile("var/office-3d/hcns.json","utf8"));
  const point=mapping.points.find((p:{key:string})=>p.key===pointKey);
  const account=await db.tai_khoan.findFirstOrThrow({where:{company_id:mapping.companyId,cho_phep_dang_nhap:true,bat_buoc_doi_mat_khau:false,
    AND:["LOCATIONS","ASSETS"].map(phan_he=>({danh_sach_vai_tro:{some:{vai_tro:{danh_sach_quyen:{some:{quyen:{phan_he,hanh_dong:{in:["VIEW","MANAGE"]}}}}}}}}))}});
  const asset=await db.tai_san.findFirstOrThrow({where:{company_id:mapping.companyId,vi_tri_id:point.locationId,loai_tai_san:{ma_loai:"PC"}},select:{id:true,ten_tai_san:true}});
  const assets=await db.tai_san.findMany({where:{company_id:mapping.companyId,vi_tri_id:point.locationId},include:{loai_tai_san:true},orderBy:[{ma_tai_san:"asc"},{id:"asc"}]});
  const records:LocationAsset[]=assets.map(a=>({id:a.id,category:a.loai_tai_san.ten_loai,categoryCode:a.loai_tai_san.ma_loai,name:a.ten_tai_san,code:a.ma_tai_san,condition:a.tinh_trang,locationId:a.vi_tri_id,version:""}));
  const equipment=equipmentForAssets(records);
  return {account,asset,equipment,records};
}

test("real desk and asset meshes focus, show the right record, and Escape restores each level on one canvas",async({page,context})=>{
  const {account,asset,equipment,records}=await data();
  await setup(page);
  await page.setViewportSize({width:1600,height:1100});
  await page.emulateMedia({reducedMotion:"reduce"});
  await signAccount(context,account);
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc&mode=room");
  const canvas=page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  await page.getByRole("button",{name:"Mặt bằng",exact:true}).click();
  await page.waitForTimeout(800);
  const roomCamera=await projection(page);
  const slot=HCNS_LAYOUT.find(s=>s.key==="hcns-07")!;
  const angle=slot.facingDegrees*Math.PI/180;
  const at=async(x:number,y:number,z:number)=>pixel(page,slot.x+x*Math.cos(angle)+z*Math.sin(angle),y,slot.z-x*Math.sin(angle)+z*Math.cos(angle));
  let p=await at(slot.width*.37,.8,slot.depth*.3);
  await page.mouse.dblclick(p.x,p.y);
  await expect(page).toHaveURL(/point=hcns-07/);
  await page.waitForTimeout(800);
  const pointCamera=await projection(page);
  expect(pointCamera.projection[0]).toBeGreaterThan(roomCamera.projection[0]*1.2);
  const pc=layoutEquipment({equipment,assets:records,width:slot.width,depth:slot.depth}).find(p=>p.assetId===asset.id && p.part==="device")!;
  const pcX=pc.position[0], scale=pc.scale;
  p=await at(pcX,pc.position[1]+.045*scale,pc.position[2]+.31*scale);
  await page.mouse.click(p.x,p.y);
  await expect(page).toHaveURL(new RegExp(`asset=${asset.id}(?:&|$)`));
  const panel=page.getByRole("region",{name:"Chi tiết vị trí",exact:true});
  await expect(panel.getByRole("heading",{name:asset.ten_tai_san,exact:true})).toBeVisible();
  await expect(panel.getByRole("link",{name:"Mở hồ sơ tài sản",exact:true})).toHaveAttribute("href",`/assets?asset=${asset.id}`);
  await expect(panel.getByRole("button",{name:"Gán nhân sự",exact:true})).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await projection(page)).projection[0]).toBeCloseTo(pointCamera.projection[0],5);
  p=await at(pcX,pc.position[1]+.045*scale,pc.position[2]+.31*scale);
  await page.mouse.dblclick(p.x,p.y);
  await page.waitForTimeout(800);
  expect((await projection(page)).projection[0]).toBeGreaterThan(pointCamera.projection[0]*1.15);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/equipment-models/asset-selected.png"});
  await page.keyboard.press("Escape");
  expect(new URL(page.url()).searchParams.has("asset")).toBe(false);
  expect(new URL(page.url()).searchParams.get("point")).toBe("hcns-07");
  await page.waitForTimeout(600);
  expect((await projection(page)).projection[0]).toBeCloseTo(pointCamera.projection[0],4);
  await page.keyboard.press("Escape");
  expect(new URL(page.url()).searchParams.has("point")).toBe(false);
  await expect(page.getByRole("region",{name:"Thông tin phòng",exact:true})).toBeVisible();
  await page.waitForTimeout(600);
  expect((await projection(page)).projection[0]).toBeCloseTo(roomCamera.projection[0],4);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/office-3d\?floor=2$/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/office-3d$/);
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
  expect(errors).toEqual([]);
});

test("expanded workspace keeps its size while Escape backs levels; menu consumes Escape first",async({page,context})=>{
  const {account,asset}=await data();
  await signAccount(context,account);
  await page.goto(`/office-3d?floor=2&room=t2_hcns_pc&mode=room&point=hcns-07&asset=${asset.id}&equipment=pc`);
  await expect(page.locator("canvas[data-building-ready=true]")).toBeVisible({timeout:90000});
  await page.getByRole("button",{name:"Mở rộng không gian 3D",exact:true}).click();
  const workspace=page.getByTestId("building-workspace");
  await page.getByRole("button",{name:"Thao tác không gian",exact:true}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("asset")).toBe(String(asset.id));
  for (const expected of ["point","mode","floor"]) {
    await page.keyboard.press("Escape");
    expect(new URL(page.url()).searchParams.has(expected)).toBe(true);
    await expect(workspace).toHaveAttribute("data-expanded","true");
  }
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/office-3d$/);
  await expect(workspace).toHaveAttribute("data-expanded","true");
  await page.keyboard.press("Escape");
  await expect(workspace).toHaveAttribute("data-expanded","false");
});

test("Minh's four assets all render and each mesh opens its own record with the same canvas",async({page,context})=>{
  const {account,records,equipment}=await data("hcns-02");
  const slot=HCNS_LAYOUT.find(s=>s.key==="hcns-02")!;
  const placed=layoutEquipment({equipment,assets:records,width:slot.width,depth:slot.depth}).filter(p=>p.part==="device");
  expect(records.length).toBeGreaterThanOrEqual(4);
  expect(placed.length).toBe(records.length);
  await setup(page);
  await signAccount(context,account);
  await page.setViewportSize({width:1600,height:1100});
  await page.emulateMedia({reducedMotion:"reduce"});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc&mode=room&point=hcns-02");
  const canvas=page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  await page.getByRole("button",{name:"Mặt bằng",exact:true}).click();
  await page.getByRole("button",{name:"Tập trung",exact:true}).click();
  await page.waitForTimeout(800);
  for(const device of placed) {
    const localY=device.kind==="pc"?.045:device.kind==="printer"?.3:device.kind==="scanner"?.05:.04;
    // Pick the monitor base, clear of the person name label above the keyboard.
    const localZ=0;
    const pos=await pixel(page,slot.x+device.position[0],device.position[1]+localY*device.scale,slot.z+device.position[2]+localZ*device.scale);
    await page.mouse.click(pos.x,pos.y);
    await expect(page).toHaveURL(new RegExp(`asset=${device.assetId}(?:&|$)`));
    const record=records.find(a=>a.id===device.assetId)!;
    await expect(page.getByRole("region",{name:"Chi tiết vị trí",exact:true}).getByRole("heading",{name:record.name,exact:true})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  await page.getByTestId("building-workspace").screenshot({path:"outputs/equipment-models/minh-layout-top.png"});
  await page.getByRole("button",{name:"Phối cảnh",exact:true}).click();
  await page.getByRole("button",{name:"Tập trung",exact:true}).click();
  await page.waitForTimeout(800);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/equipment-models/minh-layout-perspective.png"});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(800);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/equipment-models/minh-layout-mobile.png"});
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
  expect(errors).toEqual([]);
});

test("an added KHDT desk uses the same double-click focus and restores room view",async({page,context})=>{
  const {account}=await data();
  const mapping=JSON.parse(await readFile("var/office-3d/building.json","utf8"));
  const binding=mapping.rooms.find((r:{key:string})=>r.key==="plan_t2_phai_truoc");
  test.skip(!binding,"Requires existing KHDT mapping; no data created.");
  const object=await db.vat_the_3d.findFirst({where:{company_id:account.company_id,phong_id:binding.locationId,loai_vat_the:"BAN"}});
  test.skip(!object,"Requires existing KHDT desk; no data created.");
  const {BUILDING_ROOMS,floorElevation}=await import("../../src/lib/office-3d/building-layout");
  const room=BUILDING_ROOMS.find(r=>r.key===binding.key)!;
  await setup(page);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.setViewportSize({width:1600,height:1100});
  await signAccount(context,account);
  await page.goto(`/office-3d?floor=2&room=${binding.key}`);
  const canvas=page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({timeout:90000});
  await page.getByRole("button",{name:"Tập trung",exact:true}).click();
  await page.waitForTimeout(700);
  const before=await projection(page), box=(await canvas.boundingBox())!;
  const v=new Vector4(room.x+object!.toa_do_x,floorElevation(room.floor)+1.08,room.z+object!.toa_do_z,1)
    .applyMatrix4(new Matrix4().fromArray(before.view)).applyMatrix4(new Matrix4().fromArray(before.projection));
  await page.mouse.dblclick(box.x+(v.x/v.w+1)*box.width/2,box.y+(1-v.y/v.w)*box.height/2);
  await expect(page).toHaveURL(new RegExp(`point=object-${object!.id}`));
  await page.waitForTimeout(700);
  expect((await projection(page)).projection[0]).toBeGreaterThan(before.projection[0]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`room=${binding.key}$`));
  await page.waitForTimeout(700);
  expect((await projection(page)).projection[0]).toBeCloseTo(before.projection[0],4);
});

test("floor navigation animates from overview and survives rapid switches on the same canvas", async ({page, context}) => {
  await setup(page);
  await signAccount(context, (await data()).account);
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:"no-preference"});
  const errors:string[]=[], documents:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("request",r=>{if(r.resourceType()==="document")documents.push(r.url());});
  await page.goto("/office-3d");
  const canvas=page.locator("canvas[data-building-ready=true]");
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  await page.waitForTimeout(1800);
  const before=await projection(page);
  await page.getByRole("button",{name:"Tầng 2",exact:true}).click();
  const zooms:number[]=[];
  for(let i=0;i<8;i++) {
    await page.waitForTimeout(100);
    zooms.push((await projection(page)).projection[0]);
    if(i===1)await canvas.screenshot({path:"outputs/equipment-models/floor-transition-mid.png"});
  }
  await page.waitForTimeout(1600);
  const after=await projection(page);
  expect(new Set(zooms.map(v=>v.toFixed(6))).size).toBeGreaterThan(2);
  expect(after.projection[0]).toBeGreaterThan(before.projection[0]);
  // World-space geometry must stay at the original elevations while the camera moves.
  expect(before.heights.some(y=>y>20)).toBe(true);
  expect(after.heights.filter(y=>!before.heights.includes(y))).toEqual([]);
  for(const i of [0,1,2,4,5,6,8,9,10])expect(after.view[i]).toBeCloseTo(before.view[i],4);
  await canvas.screenshot({path:"outputs/equipment-models/floor-transition-end.png"});
  await page.getByRole("button",{name:"Toàn tòa nhà",exact:true}).click();
  await page.waitForTimeout(2200);
  expect((await projection(page)).projection[0]).toBeCloseTo(before.projection[0],4);
  for(const floor of [1,3,2]) {
    await page.getByRole("button",{name:`Tầng ${floor}`,exact:true}).click();
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2200);
  await expect(page).toHaveURL(/floor=2$/);
  await expect(page.getByRole("button",{name:"Trên mô hình: Phòng Hành Chính Tổng Hợp",exact:true})).toBeVisible();
  expect(await original!.evaluate(el=>el.isConnected&&el===document.querySelector("canvas"))).toBe(true);
  expect(documents).toHaveLength(1);
  expect(errors).toEqual([]);
  await page.waitForTimeout(1800);
  const idle=(await projection(page)).updates;
  await page.waitForTimeout(1000);
  expect((await projection(page)).updates).toBe(idle);
  await writeFile("outputs/equipment-models/floor-transition-result.json",JSON.stringify({zooms,before:before.projection[0],after:after.projection[0],fixedWorldElevations:true,sameCanvas:true,documentRequests:documents.length,idleUpdates:0,errors},null,2));
});
