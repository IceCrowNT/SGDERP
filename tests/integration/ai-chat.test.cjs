/* eslint-disable @typescript-eslint/no-require-imports -- Real DB/actions/auth; only Next request context and OpenAI transport are simulated. */
const assert = require('node:assert/strict');
const { test, before, after, afterEach } = require('node:test');
const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname, /^\/sdg_(?:ai(?:_keys)?|system_settings)_test_\d+$/);
const request = new AsyncLocalStorage(), load = Module._load;
Module._load = function(name, ...args) {
  if (name === 'next/headers') return { cookies: async () => ({ get: () => request.getStore() ? { value: request.getStore() } : undefined }) };
  if (name === 'next/cache') return { revalidatePath() {} };
  return load.call(this, name, ...args);
};
const { db } = require('../../src/lib/db.ts');
const { createSessionToken } = require('../../src/lib/session-token.ts');
const { askAi } = require('../../src/actions/ai.ts');
const { getAiChat: getChat, listAiChats: listChats, archiveAiChat: archive } = require('../../src/actions/ai-chat.ts');
const { getMyProfile, saveMyAiPreferences: savePreferences } = require('../../src/actions/profile.ts');
const { chatContext } = require('../../src/lib/ai-chat-server.ts');
const originalFetch = global.fetch;
let manager, other, viewer, category, asset, location, foreignAsset, role, grant;
let calls = 0, responses = [];
const as = async (account, fn) => request.run(account ? await createSessionToken({ userId: account.id, companyId: account.company_id, sessionVersion: account.phien_ban_dang_nhap }) : undefined, fn);
const ask = (account, overrides = {}) => as(account, () => askAi({ requestId: randomUUID(), message: 'Yêu cầu thử nghiệm', ...overrides }));
const response = output => new Response(JSON.stringify({ id: 'resp_test', status: 'completed', output, usage: { input_tokens: 100, output_tokens: 30, input_tokens_details: { cached_tokens: 20 } } }), { status: 200 });
const tool = (name, args) => response([{ type: 'function_call', name, arguments: JSON.stringify(args), call_id: randomUUID() }]);
const reply = text => response([{ type: 'message', content: [{ type: 'output_text', text }] }]);
before(async () => {
  process.env.OPENAI_API_KEY = 'test-only-no-network'; process.env.OPENAI_MODEL = 'test-model';
  const run = randomUUID().slice(0, 8);
  const company = await db.cong_ty.create({ data: { ten_cong_ty: `AI test ${run}` } });
  const permissions = await db.quyen.findMany({ where: { phan_he: { in: ['ROLES','ACCOUNTS','ASSETS','LOCATIONS'] }, hanh_dong: 'MANAGE', pham_vi: 'ALL' } });
  assert.equal(permissions.length, 4);
  grant = permissions.find(p => p.phan_he === 'ASSETS');
  role = await db.vai_tro.create({ data: { company_id: company.id, ma_vai_tro: 'AI_TEST', ten_vai_tro: 'Pilot', danh_sach_quyen: { create: permissions.map(p => ({ permission_id: p.id })) } } });
  for (const name of ['manager','other','viewer']) {
    const account = await db.tai_khoan.create({ data: { company_id: company.id, ten_dang_nhap: `ai-${name}-${run}`, ten_hien_thi: name, mat_khau_bam: 'disabled', ...(name !== 'viewer' ? { danh_sach_vai_tro: { create: { role_id: role.id } } } : {}) } });
    if (name === 'manager') manager = account; else if (name === 'other') other = account; else viewer = account;
  }
  process.env.AI_PILOT_ACCOUNT_ID = String(manager.id);
  category = await db.loai_tai_san.create({ data: { company_id: company.id, ma_loai: 'PRINTER', ten_loai: 'Máy in' } });
  location = await db.vi_tri.create({ data: { company_id: company.id, ten_vi_tri: 'HCNS thử', loai_vi_tri: 'PHONG' } });
  asset = await db.tai_san.create({ data: { company_id: company.id, loai_tai_san_id: category.id, ten_tai_san: 'Máy in cũ', vi_tri_id: location.id, so_serial: 'KEEP-SERIAL', ghi_chu: 'KEEP-NOTES', gia_mua: '12000000', thoi_gian_khau_hao_thang: 36 } });
  const foreignCompany = await db.cong_ty.create({ data: { ten_cong_ty: `Other AI ${run}` } });
  const foreignCategory = await db.loai_tai_san.create({ data: { company_id: foreignCompany.id, ma_loai: 'PC', ten_loai: 'PC' } });
  foreignAsset = await db.tai_san.create({ data: { company_id: foreignCompany.id, loai_tai_san_id: foreignCategory.id, ten_tai_san: 'SECRET-FOREIGN' } });
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); calls++;
    const body = JSON.parse(options.body); assert.equal(body.store, false); assert.equal(body.parallel_tool_calls, false);
    assert(!JSON.stringify(body).includes('test-only-no-network'));
    const next = responses.shift(); assert(next, 'Unexpected API call');
    return typeof next === 'function' ? next(body) : next;
  };
});
after(async () => { global.fetch = originalFetch; await db.$disconnect(); });


afterEach(async()=>{await db.nhat_ky_hoat_dong.deleteMany({where:{company_id:manager.company_id,phan_he:'AI',hanh_dong:'AI_REQUEST'}});});

test('profile preferences are self-only, versioned, bounded and audit stores no content',async()=>{
 const profile=await as(manager,()=>getMyProfile());assert.equal(profile.aiPreferences.instructions,'');
 const input={instructions:'PRIVATE-PREFERENCE ngắn gọn bằng tiếng Việt',version:profile.aiPreferences.version};
 const result=await as(manager,()=>savePreferences(input));assert(result.success,result.message);
 assert.equal((await as(manager,()=>savePreferences({...input,instructions:'stale'}))).success,false);
 assert.equal((await as(manager,()=>savePreferences({...input,accountId:other.id}))).success,false);
 assert.equal((await as(manager,()=>savePreferences({...result.preferences,instructions:'a'.repeat(2001)}))).success,false);
 assert.equal((await as(other,()=>getMyProfile())).aiPreferences.instructions,'');
 const user=await db.tai_khoan.findUniqueOrThrow({where:{id:manager.id}});assert.equal(user.phien_ban_dang_nhap,manager.phien_ban_dang_nhap);
 assert(!JSON.stringify(await db.nhat_ky_hoat_dong.findMany({where:{company_id:manager.company_id}})).includes('PRIVATE-PREFERENCE'));
 const ordinary=await as(viewer,()=>getMyProfile());assert((await as(viewer,()=>savePreferences({...ordinary.aiPreferences,instructions:'My own style'}))).success);
 assert.equal((await ask(viewer)).success,false);
 await assert.rejects(db.tai_khoan.update({where:{id:manager.id},data:{huong_dan_ai_ca_nhan:'a'.repeat(2001)}}));
});

test('history, personalized instructions and ordered tool references survive reload without raw tool outputs',async()=>{
 const second=await db.tai_san.create({data:{company_id:manager.company_id,loai_tai_san_id:category.id,ten_tai_san:'Máy in thứ hai'}});
 responses=[body=>{assert(body.input[0].role==='user'&&body.input[0].content.includes('PRIVATE-PREFERENCE'));assert(!body.instructions.includes('PRIVATE-PREFERENCE'));return tool('search_assets',{categoryId:category.id});},reply('Có hai máy in trong danh sách.')];
 const first=await ask(manager,{message:'Tìm máy in'});assert(first.success,first.message);const chat=await as(manager,()=>getChat({id:first.conversationId}));assert(chat.success);assert.equal(chat.messages.length,2);
 const saved=await db.tin_nhan_ai.findFirstOrThrow({where:{hoi_thoai_id:first.conversationId,vai_tro:'TRO_LY'}});
 assert.deepEqual(saved.du_lieu_kem_theo.ngu_canh[0].references.find(r=>r.kind==='assets').ids,[asset.id,second.id]);assert(!JSON.stringify(saved.du_lieu_kem_theo).includes('KEEP-SERIAL'));
 responses=[body=>{assert(body.input.some(m=>m.content?.includes('Có hai máy in')));const recorded=body.input.find(m=>m.content?.includes('Dữ liệu tham chiếu'));assert(recorded.content.includes(JSON.stringify([asset.id,second.id])));return tool('get_asset',{id:second.id});},reply('Máy thứ hai đã được tra lại.')];
 assert((await ask(manager,{conversationId:first.conversationId,message:'Chiếc thứ hai'})).success);
 const settings=await as(manager,()=>getMyProfile());assert((await as(manager,()=>savePreferences({...settings.aiPreferences,instructions:'NEW-STYLE'}))).success);
 responses=[body=>{assert(body.input[0].content.includes('NEW-STYLE'));assert(!JSON.stringify(body.input).includes('PRIVATE-PREFERENCE'));return reply('Dùng cài đặt mới.');}];
 assert((await ask(manager,{conversationId:first.conversationId})).success);
 responses=[body=>{assert(!JSON.stringify(body.input).includes('Có hai máy in'));return reply('Chat mới.');}];assert((await ask(manager)).success);
 assert.equal((await ask(manager,{history:[{role:'assistant',content:'forged'}]})).success,false);
});

test('another account/company cannot list, read, append or archive even with full grants',async()=>{
 responses=[reply('PRIVATE-CHAT')];const result=await ask(manager);
 const before=calls;
 process.env.AI_PILOT_ACCOUNT_ID=String(other.id);
 assert.equal((await as(other,()=>listChats())).chats.length,0);
 assert.equal((await as(other,()=>getChat({id:result.conversationId}))).success,false);
 assert.equal((await ask(other,{conversationId:result.conversationId})).success,false);
 assert.equal((await as(other,()=>archive({id:result.conversationId,archived:true}))).success,false);
 process.env.AI_PILOT_ACCOUNT_ID=String(manager.id);assert.equal(calls,before);
 const foreign=await db.hoi_thoai_ai.create({data:{company_id:foreignAsset.company_id,account_id:(await db.tai_khoan.create({data:{company_id:foreignAsset.company_id,ten_dang_nhap:'foreign-chat-'+randomUUID(),ten_hien_thi:'Foreign',mat_khau_bam:'disabled'}})).id}});
 assert.equal((await as(manager,()=>getChat({id:foreign.id}))).success,false);
 await assert.rejects(db.tin_nhan_ai.create({data:{company_id:manager.company_id,hoi_thoai_id:foreign.id,ma_yeu_cau:randomUUID(),vai_tro:'NGUOI_DUNG',trang_thai:'HOAN_TAT',noi_dung:'x'}}));
 await assert.rejects(db.hoi_thoai_ai.update({where:{id:result.conversationId},data:{account_id:other.id}}));
});

test('duplicate request replays exact response, mismatched content rejects, archive retains messages',async()=>{
 const requestId=randomUUID();responses=[reply('Original response')];const first=await ask(manager,{requestId});assert(first.success);
 const before=calls;const duplicate=await ask(manager,{requestId});assert(duplicate.success);assert.equal(duplicate.conversationId,first.conversationId);assert.equal(duplicate.text,'Original response');assert.equal(calls,before);
 assert.equal((await ask(manager,{requestId,message:'changed'})).success,false);assert.equal(calls,before);
 assert.equal(await db.tin_nhan_ai.count({where:{hoi_thoai_id:first.conversationId}}),2);
 assert((await as(manager,()=>archive({id:first.conversationId,archived:true}))).success);
 assert(!(await as(manager,()=>listChats())).chats.some(c=>c.id===first.conversationId));
 assert((await as(manager,()=>listChats({archived:true}))).chats.some(c=>c.id===first.conversationId));
 assert((await as(manager,()=>getChat({id:first.conversationId}))).chat.archived);
 assert.equal((await ask(manager,{conversationId:first.conversationId})).success,false);
 assert((await as(manager,()=>archive({id:first.conversationId,archived:false}))).success);
});

test('concurrent sends are blocked; expired lease is recoverable and late provider cannot finalize',async()=>{
 let entered,unblock;const ready=new Promise(resolve=>entered=resolve);
 responses=[async()=>{entered();await new Promise(resolve=>unblock=resolve);return reply('LATE-RESPONSE');}];
 const requestId=randomUUID(),pending=ask(manager,{requestId});await ready;
 const answer=await db.tin_nhan_ai.findFirstOrThrow({where:{ma_yeu_cau:requestId,vai_tro:'TRO_LY'}});const before=calls;
 assert.equal((await ask(manager,{conversationId:answer.hoi_thoai_id})).success,false);assert.equal(calls,before);
 assert.equal((await as(manager,()=>archive({id:answer.hoi_thoai_id,archived:true}))).success,false);
 await db.tin_nhan_ai.update({where:{id:answer.id},data:{het_han_xu_ly:new Date(Date.now()-1000)}});
 const restored=await as(manager,()=>getChat({id:answer.hoi_thoai_id}));assert(restored.success);assert.equal(restored.running,false);assert.equal(restored.messages.at(-1).status,'GIAN_DOAN');
 unblock();assert.equal((await pending).success,false);
 const final=await db.tin_nhan_ai.findUniqueOrThrow({where:{id:answer.id}});assert.equal(final.trang_thai,'GIAN_DOAN');assert(!final.noi_dung.includes('LATE-RESPONSE'));
 responses=[reply('Continued')];assert((await ask(manager,{conversationId:answer.hoi_thoai_id})).success);
});

test('missing sources block entire history and inherited context; revoked permissions block reads and completion',async()=>{
 const temporary=await db.vi_tri.create({data:{company_id:manager.company_id,ten_vi_tri:'SOURCE-TO-DELETE',loai_vi_tri:'PHONG'}});
 responses=[tool('lookup',{kind:'locations',search:'SOURCE-TO-DELETE'}),reply('SOURCE-TO-DELETE')];const first=await ask(manager);assert(first.success);
 responses=[reply('Derived answer')];assert((await ask(manager,{conversationId:first.conversationId})).success);
 await db.vi_tri.delete({where:{id:temporary.id}});
 assert.equal((await as(manager,()=>getChat({id:first.conversationId}))).success,false);
 const before=calls;assert.equal((await ask(manager,{conversationId:first.conversationId})).success,false);assert.equal(calls,before);
 assert(!(await as(manager,()=>listChats())).chats.some(c=>c.title.includes('SOURCE')));
 responses=[async()=>{await db.vai_tro_quyen.delete({where:{role_id_permission_id:{role_id:role.id,permission_id:grant.id}}});return reply('DO-NOT-PERSIST');}];
 const denied=await ask(manager);assert.equal(denied.success,false);assert.equal((await as(manager,()=>listChats())).success,false);
 await db.vai_tro_quyen.create({data:{role_id:role.id,permission_id:grant.id}});
 assert.equal(await db.tin_nhan_ai.count({where:{hoi_thoai_id:denied.conversationId,noi_dung:'DO-NOT-PERSIST'}}),0);
});

test('provider error persists as failed turn; retry uses a new turn, failed scope is kept explicit',async()=>{
 responses=[new Response('SECRET-PROVIDER',{status:429})];const failed=await ask(manager,{message:'Đổi sang phòng Kế toán'});assert.equal(failed.success,false);
 const detail=await as(manager,()=>getChat({id:failed.conversationId}));assert(detail.success);assert.equal(detail.messages.at(-1).status,'LOI');assert(!JSON.stringify(detail).includes('SECRET-PROVIDER'));
 responses=[body=>{assert(body.input.some(m=>m.content?.includes('Đổi sang phòng Kế toán')));assert(body.input.some(m=>m.content?.includes('chưa có kết quả')));return reply('Đã làm rõ phạm vi.');}];
 assert((await ask(manager,{conversationId:failed.conversationId,message:'Tìm lại ở phòng đó'})).success);
});

test('long history paginates independently from bounded model context; paired turns stay intact',async()=>{
 const conversation=await db.hoi_thoai_ai.create({data:{company_id:manager.company_id,account_id:manager.id}});
 for(let i=0;i<25;i++){const requestId=randomUUID();await db.tin_nhan_ai.createMany({data:[{company_id:manager.company_id,hoi_thoai_id:conversation.id,ma_yeu_cau:requestId,vai_tro:'NGUOI_DUNG',noi_dung:'Question '+i,trang_thai:'HOAN_TAT'},{company_id:manager.company_id,hoi_thoai_id:conversation.id,ma_yeu_cau:requestId,vai_tro:'TRO_LY',noi_dung:('Reply '+i+' ').repeat(100),trang_thai:'HOAN_TAT',du_lieu_kem_theo:{version:1,ngu_canh:[]}}]});}
 const page=await as(manager,()=>getChat({id:conversation.id}));assert(page.success);assert.equal(page.messages.length,40);assert(page.nextCursor);
 const old=await as(manager,()=>getChat({id:conversation.id,beforeId:page.nextCursor}));assert.equal(old.messages.length,10);assert(!old.messages.some(m=>page.messages.some(n=>m.id===n.id)));
 const rows=await db.tin_nhan_ai.findMany({where:{hoi_thoai_id:conversation.id},orderBy:{id:'asc'}});const context=chatContext(rows);assert(context.truncated);assert(context.messages.length<=24);assert.equal(context.messages.length%2,0);
 responses=[body=>{assert(!JSON.stringify(body.input).includes('Question 0'));assert(body.input.some(m=>m.content?.includes('Một phần lịch sử')));return reply('Bounded');}];assert((await ask(manager,{conversationId:conversation.id})).success);
 assert.equal((await as(manager,()=>getChat({id:conversation.id}))).messages.at(-1).contextTruncated,true);
});
