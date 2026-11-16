import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { signAccount } from "../helpers/account-fixture";
const db = new PrismaClient();
test.setTimeout(120000);
test.afterAll(()=>db.$disconnect());
const plain=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();
async function data() {
  const mapping=JSON.parse(await readFile("var/office-3d/hcns.json","utf8"));
  const account=await db.tai_khoan.findFirstOrThrow({where:{company_id:mapping.companyId,cho_phep_dang_nhap:true,bat_buoc_doi_mat_khau:false,
    AND:["LOCATIONS","HR","ASSETS"].map(phan_he=>({danh_sach_vai_tro:{some:{vai_tro:{danh_sach_quyen:{some:{quyen:{phan_he,hanh_dong:{in:["VIEW","MANAGE"]}}}}}}}}))}});
  const points=mapping.points as {key:string;locationId:number}[];
  const person=await db.nhan_su.findFirstOrThrow({where:{company_id:mapping.companyId,tinh_trang_lam_viec:"ACTIVE",vi_tri_lam_viec_id:{in:points.map(p=>p.locationId)}}});
  const asset=await db.tai_san.findFirstOrThrow({where:{company_id:mapping.companyId,vi_tri_id:{in:points.map(p=>p.locationId)}},include:{loai_tai_san:true}});
  const unassigned=await db.nhan_su.findFirst({where:{company_id:mapping.companyId,tinh_trang_lam_viec:"ACTIVE",vi_tri_lam_viec_id:null}});
  return {account,person,asset,unassigned,point:points.find(p=>p.locationId===person.vi_tri_lam_viec_id)!};
}
async function search(page:Page,query:string) {
  await page.getByRole("combobox",{name:"Tìm nhân sự hoặc tài sản",exact:true}).fill(query);
}
async function category(page:Page,name:string) {
  await page.getByRole("button",{name:"Lọc loại tài sản",exact:true}).click();
  await page.getByRole("menuitemradio",{name,exact:true}).click();
}

test("suggest only after typing, limit results, search and zoom without replacing canvas",async({page,context})=>{
  const {account,person,point,unassigned}=await data();
  await page.setViewportSize({width:1600,height:1100});
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await signAccount(context,account);
  await page.goto("/office-3d");
  const canvas=page.locator('canvas[data-building-ready="true"]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  const input=page.getByRole("combobox",{name:"Tìm nhân sự hoặc tài sản",exact:true});
  await input.click();
  await expect(page.getByRole("listbox",{name:"Gợi ý đối tượng 3D"})).toHaveCount(0);
  await input.fill("   ");
  await expect(page.getByRole("option")).toHaveCount(0);
  await input.fill("nguyen");
  await expect(page.getByRole("option")).toHaveCount(6);
  await expect(page.getByText("Nhập cụ thể hơn để thu hẹp kết quả.")).toBeVisible();
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/suggestions-desktop.png"});
  await page.keyboard.press("Escape");
  await expect(input).toHaveAttribute("aria-expanded","false");
  await input.fill(plain(person.ho_ten));
  expect(new URL(page.url()).searchParams.has("point")).toBe(false);
  await page.keyboard.press("Tab");
  await expect(input).toHaveAttribute("aria-expanded","false");
  await input.click();
  await page.getByRole("option",{name:person.ho_ten,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`point=${point.key}`));
  await expect(page.locator('[data-person-marker="person"]').filter({hasText:person.ho_ten})).toBeVisible({timeout:15000});
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
  await page.getByRole("button",{name:"Tổng quan phòng HCNS",exact:true}).click();
  if(unassigned){
    const before=page.url();
    await search(page,plain(unassigned.ho_ten));
    await page.getByRole("option",{name:unassigned.ho_ten,exact:true}).click();
    await expect(page.getByText(`${unassigned.ho_ten}: chưa được gán vị trí làm việc.`,{exact:false})).toBeVisible();
    expect(page.url()).toBe(before);
  }
  await search(page,"khongcotrongdulieu-9385");
  await expect(page.getByText("Không tìm thấy kết quả phù hợp.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Hiển thị nhân sự",exact:true}).click();
  await expect(input).toHaveAttribute("aria-expanded","false");
  await page.getByRole("button",{name:"Xóa nội dung tìm kiếm",exact:true}).click();
  await expect(input).toHaveValue("");
  await expect(page.getByRole("option")).toHaveCount(0);
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
  expect(errors).toEqual([]);
});

test("separate independent layer toggles retain selection; searching reveals only the target layer",async({page,context})=>{
  const {account,person,asset,point}=await data();
  await page.setViewportSize({width:1600,height:1100});
  await signAccount(context,account);
  await page.goto(`/office-3d?floor=2&room=t2_hcns_pc&mode=room&point=${point.key}`);
  const canvas=page.locator('canvas[data-building-ready="true"]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  const before=page.url();
  const people=page.getByRole("button",{name:"Hiển thị nhân sự",exact:true});
  const assets=page.getByRole("button",{name:"Hiển thị tài sản",exact:true});
  await expect(page.getByTestId("scene-search").getByRole("button",{name:/Hiển thị/})).toHaveCount(0);
  await people.click(); await assets.click();
  await expect(people).toHaveAttribute("aria-pressed","false");
  await expect(assets).toHaveAttribute("aria-pressed","false");
  await expect(page.locator('[data-person-marker="person"]')).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Lọc loại tài sản",exact:true})).toBeDisabled();
  expect(page.url()).toBe(before);
  await page.waitForTimeout(900);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/context-only.png"});
  await search(page,plain(person.ho_ten));
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowUp"); await page.keyboard.press("Enter");
  await expect(people).toHaveAttribute("aria-pressed","true");
  await expect(assets).toHaveAttribute("aria-pressed","false");
  await expect(page.locator('[data-person-marker="person"]').filter({hasText:person.ho_ten})).toBeVisible({timeout:15000});
  await people.click();
  await search(page,asset.ma_tai_san);
  await page.getByRole("option",{name:asset.ten_tai_san,exact:true}).click();
  await expect(assets).toHaveAttribute("aria-pressed","true");
  await expect(people).toHaveAttribute("aria-pressed","false");
  await expect(page).toHaveURL(/point=/);
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
});

test("category filter keeps people, expanded Escape closes suggestions first, floor scope remains correct",async({page,context})=>{
  const {account,person,asset}=await data();
  await signAccount(context,account);
  await page.goto("/office-3d");
  const canvas=page.locator('canvas[data-building-ready="true"]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  await page.getByRole("button",{name:"Mở rộng không gian 3D",exact:true}).click();
  await search(page,plain(person.ho_ten));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox",{name:"Tìm nhân sự hoặc tài sản",exact:true})).toHaveAttribute("aria-expanded","false");
  await expect(page.getByTestId("building-workspace")).toHaveAttribute("data-expanded","true");
  await category(page,asset.loai_tai_san.ten_loai);
  await expect(page.getByRole("region",{name:"Kết quả lọc 3D"})).toContainText(asset.ten_tai_san);
  await expect(page.getByRole("button",{name:"Hiển thị nhân sự",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("group",{name:"Chọn tầng",exact:true}).getByRole("button",{name:"Tầng 3",exact:true}).click();
  await expect(page.getByRole("region",{name:"Kết quả lọc 3D"})).toContainText("Chưa có tài sản loại này được gán trong không gian đang xem.");
  await page.getByRole("group",{name:"Chọn tầng",exact:true}).getByRole("button",{name:"Tầng 2",exact:true}).click();
  await expect(page.getByRole("region",{name:"Kết quả lọc 3D"})).toContainText(asset.ten_tai_san);
  await category(page,"Tất cả loại tài sản");
  await expect(page.getByRole("region",{name:"Kết quả lọc 3D"})).toHaveCount(0);
  await page.getByRole("button",{name:"Thu gọn không gian 3D",exact:true}).click();
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
});

test("mobile search and layer controls fit, remain touchable and work in dark mode",async({page,context})=>{
  const {account,person}=await data();
  await page.setViewportSize({width:390,height:844});
  await signAccount(context,account);
  await page.goto("/office-3d?floor=2&room=t2_hcns_pc&mode=room");
  await expect(page.locator('canvas[data-building-ready="true"]')).toBeVisible({timeout:90000});
  await search(page,plain(person.ho_ten));
  await page.waitForTimeout(900);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/mobile-suggestions.png"});
  await page.keyboard.press("Enter");
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    if (width === 320) expect((await page.getByTestId("scene-search").boundingBox())!.width).toBeGreaterThan(240);
    for(const name of ["Hiển thị nhân sự","Hiển thị tài sản"]){
      const button=page.getByRole("button",{name,exact:true});
      const box=await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(40);expect(box!.height).toBeGreaterThanOrEqual(40);
      await button.click();await expect(button).toHaveAttribute("aria-pressed","false");await button.click();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.evaluate(()=>document.documentElement.classList.add("dark"));
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/mobile-dark.png"});
});

test("building directory starts grouped, expands by keyboard, filters spaces and selects without replacing canvas",async({page,context})=>{
  const {account}=await data();
  await page.setViewportSize({width:1600,height:1100});
  await page.emulateMedia({reducedMotion:"reduce"});
  await signAccount(context,account);
  await page.goto("/office-3d");
  const canvas=page.locator('canvas[data-building-ready="true"]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  const directory=page.getByRole("region",{name:"Danh sách không gian",exact:true});
  await expect(directory).toBeVisible();
  for(const floor of [1,2,3]) await expect(page.getByTestId(`spaces-floor-${floor}`)).not.toHaveAttribute("open", "");
  await expect(directory.getByRole("button",{name:/^Xem không gian/})).toHaveCount(0);
  await expect(page.getByText("Khám phá không gian",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Đến phòng HCNS",exact:true})).toHaveCount(0);
  await page.waitForTimeout(700);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/overview-compact.png"});
  const before=page.url();
  await page.getByTestId("spaces-floor-2").locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("spaces-floor-2")).toHaveAttribute("open", "");
  expect(page.url()).toBe(before);
  const search=directory.getByRole("textbox",{name:"Tìm không gian trong mô hình"});
  await search.fill("ke hoach dau tu");
  await expect(directory.getByRole("button",{name:/^Xem không gian/})).toHaveCount(1);
  await expect(page.getByTestId("spaces-floor-1")).toHaveCount(0);
  await page.getByTestId("building-workspace").screenshot({path:"outputs/scene-search/space-results.png"});
  await directory.getByRole("button",{name:/^Xem không gian/}).click();
  await expect(page).toHaveURL(/room=plan_t2_phai_truoc/);
  await expect(page.getByRole("region",{name:"Danh sách không gian",exact:true})).toBeHidden();
  await page.locator("summary",{hasText:"Đổi không gian"}).click();
  await expect(page.getByTestId("spaces-floor-2")).toHaveAttribute("open", "");
  await page.getByRole("textbox",{name:"Tìm không gian trong mô hình"}).fill("zzz-no-space");
  await expect(page.getByText("Không tìm thấy không gian phù hợp.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Xóa tìm kiếm không gian",exact:true}).click();
  await expect(page.getByTestId("spaces-floor-2")).toBeVisible();
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
});

test("search clears after a result or navigation, preserves typing through local controls and history never revives stale text",async({page,context})=>{
  const {account,person}=await data();
  await page.setViewportSize({width:1600,height:1100});
  await signAccount(context,account);
  await page.goto("/office-3d");
  const canvas=page.locator('canvas[data-building-ready="true"]');
  await expect(canvas).toBeVisible({timeout:90000});
  const original=await canvas.elementHandle();
  const input=page.getByRole("combobox",{name:"Tìm nhân sự hoặc tài sản",exact:true});
  await search(page,plain(person.ho_ten));await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/point=/);
  await expect(input).toHaveValue("");
  await input.fill("nguyen");await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Hiển thị tài sản",exact:true}).click();
  await expect(input).toHaveValue("nguyen");
  await page.getByRole("button",{name:"Mở rộng không gian 3D",exact:true}).click();
  await expect(input).toHaveValue("nguyen");
  await page.getByRole("button",{name:"Thu gọn không gian 3D",exact:true}).click();
  await page.getByRole("button",{name:"Tổng quan phòng HCNS",exact:true}).click();
  await expect(input).toHaveValue("");
  await input.fill("nguyen");await page.keyboard.press("Escape");
  await page.getByRole("button",{name:"Trở lại tầng 2",exact:true}).click();
  await expect(input).toHaveValue("");
  await input.fill("nguyen");await page.keyboard.press("Escape");
  await page.goBack();await expect(input).toHaveValue("");
  await input.fill("nguyen");await page.keyboard.press("Escape");
  await page.goForward();await expect(input).toHaveValue("");
  expect(await original!.evaluate(el=>el===document.querySelector("canvas"))).toBe(true);
});
