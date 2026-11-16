import {test, expect, type Page} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import {readFile} from "node:fs/promises";
import {Matrix4,Vector4} from "three";
import {signAccount} from "../helpers/account-fixture";
import {HCNS_LAYOUT, equipmentForAssets} from "../../src/lib/office-3d/hcns-layout";
import {hcnsWorldPoint} from "../../src/lib/office-3d/building-navigation";
const db = new PrismaClient();
test.afterAll(()=>db.$disconnect());
async function setup(page:Page) {
  await page.addInitScript(() => {
    const target = window as unknown as { sceneProbe: { view: number[]; projection: number[] } };
    target.sceneProbe = { view: [], projection: [] };
    const names = new WeakMap<WebGLUniformLocation, string>();
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const get = proto.getUniformLocation, set = proto.uniformMatrix4fv;
      proto.getUniformLocation = function(program, name) { const loc = get.call(this, program, name); if (loc) names.set(loc, name); return loc; };
      proto.uniformMatrix4fv = function(loc: WebGLUniformLocation | null, transpose: boolean, data: Float32List) {
        const result = set.call(this, loc, transpose, data), vp = this.getParameter(this.VIEWPORT);
        if (loc && vp[2] === this.drawingBufferWidth && vp[3] === this.drawingBufferHeight) {
          if (names.get(loc) === "viewMatrix") target.sceneProbe.view = Array.from(data);
          if (names.get(loc) === "projectionMatrix") target.sceneProbe.projection = Array.from(data);
        }
        return result;
      };
    }
  });
}
async function projection(page:Page) {
  return page.evaluate(()=>(window as unknown as {sceneProbe:{view:number[];projection:number[]}}).sceneProbe);
}
async function pixel(page:Page,x:number,y:number,z:number) {
  const matrices=await projection(page);
  const v=new Vector4(...hcnsWorldPoint(x,y,z),1).applyMatrix4(new Matrix4().fromArray(matrices.view)).applyMatrix4(new Matrix4().fromArray(matrices.projection));
  const box=(await page.locator("canvas").boundingBox())!;
  return {x:box.x+(v.x/v.w+1)*box.width/2,y:box.y+(1-v.y/v.w)*box.height/2};
}
async function data() {
  const mapping=JSON.parse(await readFile("var/office-3d/hcns.json","utf8"));
  const point=mapping.points.find((p:{key:string})=>p.key==="hcns-07");
  const account=await db.tai_khoan.findFirstOrThrow({where:{company_id:mapping.companyId,cho_phep_dang_nhap:true,bat_buoc_doi_mat_khau:false,
    AND:["LOCATIONS","ASSETS"].map(phan_he=>({danh_sach_vai_tro:{some:{vai_tro:{danh_sach_quyen:{some:{quyen:{phan_he,hanh_dong:{in:["VIEW","MANAGE"]}}}}}}}}))}});
  const asset=await db.tai_san.findFirstOrThrow({where:{company_id:mapping.companyId,vi_tri_id:point.locationId,loai_tai_san:{ma_loai:"PC"}},select:{id:true,ten_tai_san:true}});
  const assets=await db.tai_san.findMany({where:{company_id:mapping.companyId,vi_tri_id:point.locationId},include:{loai_tai_san:true},orderBy:[{ma_tai_san:"asc"},{id:"asc"}]});
  const equipment=equipmentForAssets(assets.map(item=>({category:item.loai_tai_san.ten_loai,categoryCode:item.loai_tai_san.ma_loai}))).slice(0,3);
  return {account,asset,equipment};
}

test("real desk and asset meshes focus, show the right record, and Escape restores each level on one canvas",async({page,context})=>{
  const {account,asset,equipment}=await data();
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
  // Follow the current asset layout: adding another device shifts/scales the PC.
  const pcX=(equipment.indexOf("pc")-(equipment.length-1)/2)*slot.width/equipment.length;
  const scale=Math.min(.85,slot.width/(equipment.length*1.1),slot.depth/.8);
  p=await at(pcX,.85+.045*scale,-.05+.31*scale);
  await page.mouse.click(p.x,p.y);
  await expect(page).toHaveURL(new RegExp(`asset=${asset.id}(?:&|$)`));
  const panel=page.getByRole("region",{name:"Chi tiết vị trí",exact:true});
  await expect(panel.getByRole("heading",{name:asset.ten_tai_san,exact:true})).toBeVisible();
  await expect(panel.getByRole("link",{name:"Mở hồ sơ tài sản",exact:true})).toHaveAttribute("href",`/assets?asset=${asset.id}`);
  await expect(panel.getByRole("button",{name:"Gán nhân sự",exact:true})).toHaveCount(0);
  await page.waitForTimeout(300);
  expect((await projection(page)).projection[0]).toBeCloseTo(pointCamera.projection[0],5);
  p=await at(pcX,.85+.045*scale,-.05+.31*scale);
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

test("an added KHDT desk uses the same double-click focus and restores room view",async({page,context})=>{
  const {account}=await data();
  const mapping=JSON.parse(await readFile("var/office-3d/building.json","utf8"));
  const binding=mapping.rooms.find((r:{key:string})=>r.key==="plan_t2_phai_truoc");
  test.skip(!binding,"Requires existing KHDT mapping; no data created.");
  const object=await db.vat_the_3d.findFirst({where:{company_id:account.company_id,phong_id:binding.locationId,loai_vat_the:"BAN"}});
  test.skip(!object,"Requires existing KHDT desk; no data created.");
  const {BUILDING_ROOMS}=await import("../../src/lib/office-3d/building-layout");
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
  const v=new Vector4(room.x+object!.toa_do_x,1.08,room.z+object!.toa_do_z,1)
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
