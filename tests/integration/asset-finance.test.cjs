/* eslint-disable @typescript-eslint/no-require-imports -- Shim Next request context only; actions, DB, auth and transactions are real. */
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_assets_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { saveAsset, saveAssetCategory, getAsset } = require('../../src/actions/asset.ts');
const { assetFormValues } = require('../../src/components/assets/asset-form-values.ts');
const run = randomUUID().slice(0,8);
let manager, viewer, category, original;
const as = async (account, fn) => request.run(await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }), fn);
before(async () => {
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `Finance ${run}` } });
  for (const level of ['MANAGE','VIEW']) {
    const permission = await db.quyen.findFirstOrThrow({ where: { phan_he:'ASSETS', hanh_dong:level, pham_vi:'ALL' } });
    const role = await db.vai_tro.create({ data: { company_id:company.id, ma_vai_tro:level, ten_vai_tro:level, danh_sach_quyen:{create:{permission_id:permission.id}} } });
    const account = await db.tai_khoan.create({ data: { company_id:company.id, ten_dang_nhap:`finance-${level}-${run}`,ten_hien_thi:level,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}} } });
    if(level==='MANAGE')manager=account;else viewer=account;
  }
  category=await db.loai_tai_san.create({data:{company_id:company.id,ma_loai:'PC',ten_loai:'PC',khau_hao_mac_dinh_thang:36}});
});
after(async()=>db.$disconnect());
test('save exact currency and dates with audit; defaults do not invent data', async()=>{
  const empty=await as(manager,()=>saveAsset({name:'No finance',categoryId:category.id}));assert(empty.success);
  assert.equal(empty.row.gia_mua,null);assert.equal(empty.row.thoi_gian_khau_hao_thang,null);
  const r=await as(manager,()=>saveAsset({name:'Finance',categoryId:category.id,purchaseDate:'2024-02-29',purchasePrice:'999999999999999999',depreciationMonths:36,warrantyUntil:'2027-02-28'}));
  assert(r.success,r.message);original=r.row;
  assert.equal(original.gia_mua,'999999999999999999');assert.equal(original.ngay_mua.toISOString(),'2024-02-29T00:00:00.000Z');
  const event=await db.nhat_ky_hoat_dong.findFirstOrThrow({where:{doi_tuong_id:`tai_san:${r.id}`,company_id:manager.company_id}});
  assert.equal(event.du_lieu_moi.gia_mua,'999999999999999999');
});
test('legacy edits preserve optional fields; explicit null clears; stale/code tampering and VIEW rejected',async()=>{
  const full=assetFormValues(original), legacy={...full};for(const key of ['purchaseDate','purchasePrice','depreciationMonths','warrantyUntil'])delete legacy[key];
  const r=await as(manager,()=>saveAsset({...legacy,name:'Rename'}));assert(r.success,r.message);assert.equal(r.row.gia_mua,original.gia_mua);assert.equal(r.row.thoi_gian_khau_hao_thang,36);
  assert.equal((await as(manager,()=>saveAsset({...full,name:'Stale'}))).success,false);
  assert.equal((await as(manager,()=>saveAsset({...assetFormValues(r.row),ma_tai_san:'CHANGE'}))).success,false);
  assert.equal((await as(viewer,()=>saveAsset({...assetFormValues(r.row),purchasePrice:'1'}))).success,false);
  const cleared=await as(manager,()=>saveAsset({...assetFormValues(r.row),purchasePrice:null,warrantyUntil:null}));assert(cleared.success,cleared.message);assert.equal(cleared.row.gia_mua,null);assert.equal(cleared.row.han_bao_hanh,null);
  original=cleared.row;
});
test('category default changes do not rewrite asset periods; validation failures leave audit/data unchanged',async()=>{
  const count=await db.nhat_ky_hoat_dong.count({where:{company_id:manager.company_id,doi_tuong_id:`tai_san:${original.id}`}});
  const changed=await as(manager,()=>saveAssetCategory({id:category.id,version:category.updated_at.toISOString(),code:'PC',name:'PC',defaultDepreciationMonths:60}));assert(changed.success,changed.message);
  assert.equal((await as(manager,()=>getAsset(original.id))).row.thoi_gian_khau_hao_thang,36);
  for(const fields of [{purchasePrice:'-1'},{depreciationMonths:0},{warrantyUntil:'2024-02-28'},{purchaseDate:'2025-02-30'}])assert.equal((await as(manager,()=>saveAsset({...assetFormValues(original),...fields}))).success,false);
  assert.equal(await db.nhat_ky_hoat_dong.count({where:{company_id:manager.company_id,doi_tuong_id:`tai_san:${original.id}`}}),count);
});
