/* eslint-disable @typescript-eslint/no-require-imports -- Real DB, crypto and auth; only request context and OpenAI HTTP are mocked. */
const assert=require('node:assert/strict');
const {test,before,after}=require('node:test');
const {AsyncLocalStorage}=require('node:async_hooks');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises'),path=require('node:path'),Module=require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/sdg_ai_keys_test_\d+$/);
const request=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,...args){
 if(name==='next/headers')return {cookies:async()=>({get:()=>request.getStore()?{value:request.getStore()}:undefined})};
 if(name==='next/cache')return {revalidatePath(){}};
 return load.call(this,name,...args);
};
const {db}=require('../../src/lib/db.ts');
const {createSessionToken}=require('../../src/lib/session-token.ts');
const {getAiSettings,saveAiSettings,testAiKey}=require('../../src/actions/ai-settings.ts');
const {askAi}=require('../../src/actions/ai.ts');
const {readAiConnection}=require('../../src/lib/ai-connection.ts');
const {readAiSecret,storeAiSecret}=require('../../src/lib/ai-secret-store.ts');
const key1='sk-test-key-settings-FIRST-1111',key2='sk-test-key-settings-SECOND-2222';
const as=async(account,fn)=>request.run(account?await createSessionToken({userId:account.id,companyId:account.company_id,sessionVersion:account.phien_ban_dang_nhap}):undefined,fn);
const current=()=>db.ket_noi_ai.findUniqueOrThrow({where:{company_id:manager.company_id}});
const save=(values)=>as(manager,()=>saveAiSettings(values));
const json=data=>new Response(JSON.stringify(data),{status:200});
let manager,other,foreignCompany,role,grant,vault,originalFetch,calls=0,transport;
before(async()=>{
 const run=randomUUID().slice(0,8),company=await db.cong_ty.create({data:{ten_cong_ty:`AI keys ${run}`}});
 const permissions=await db.quyen.findMany({where:{phan_he:{in:['ROLES','ACCOUNTS','ASSETS','LOCATIONS']},hanh_dong:'MANAGE',pham_vi:'ALL'}});assert.equal(permissions.length,4);grant=permissions.find(p=>p.phan_he==='ROLES');
 role=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'AI_KEYS',ten_vai_tro:'Keys',danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
 for(const name of ['manager','other']){const a=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:`ai-key-${name}-${run}`,ten_hien_thi:name,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});if(name==='manager')manager=a;else other=a;}
 foreignCompany=await db.cong_ty.create({data:{ten_cong_ty:`Other keys ${run}`}});
 process.env.AI_PILOT_ACCOUNT_ID=String(manager.id);process.env.OPENAI_API_KEY='';process.env.OPENAI_MODEL='';
 const base=path.resolve('outputs/ai-settings');await fs.mkdir(base,{recursive:true});vault=await fs.mkdtemp(path.join(base,'vault-'));process.env.AI_SECRET_STORAGE_DIR=vault;
 originalFetch=global.fetch;global.fetch=async(url,options)=>{calls++;assert(['https://api.openai.com/v1/models','https://api.openai.com/v1/responses'].includes(url));assert.equal(options.redirect,'error');assert(transport,'Unexpected network request');return transport(url,options);};
});
after(async()=>{global.fetch=originalFetch;await db.$disconnect();});

test('only bound account with current grants can read or change settings; validation does not save',async()=>{
 for(const a of [null,other]){assert.equal((await as(a,getAiSettings)).success,false);assert.equal((await as(a,()=>saveAiSettings({version:null,apiKey:key1,model:'test-model',enabled:true}))).success,false);}
 assert.equal((await save({version:null,apiKey:'',model:'test-model',enabled:true})).success,false);
 assert.equal((await save({version:null,apiKey:key1,model:'bad\nmodel',enabled:true})).success,false);
 assert.equal((await save({version:null,apiKey:key1,model:'test-model',enabled:true,companyId:foreignCompany.id})).success,false);
 assert.equal(await db.ket_noi_ai.count({where:{company_id:manager.company_id}}),0);assert.equal(calls,0);
});

test('save encrypts key outside DB; only masked metadata returns and audit is atomic',async()=>{
 const r=await save({version:null,apiKey:key1,model:'test-model-one',enabled:true});assert(r.success,r.message);
 assert.equal(r.settings.maskedKey,'••••1111');assert(!JSON.stringify(r).includes(key1));assert(!('apiKey' in r.settings));assert(!('tham_chieu_bi_mat' in r.settings));
 const row=await current();assert(!JSON.stringify(row).includes(key1));assert.equal(await readAiSecret(manager.company_id,row.tham_chieu_bi_mat),key1);
 const file=path.join(vault,`${row.tham_chieu_bi_mat}.secret.json`);assert(!(await fs.readFile(file,'utf8')).includes(key1));
 assert.equal((await fs.stat(file)).mode&0o777,0o600);assert.equal((await fs.stat(path.join(vault,'master.key'))).mode&0o777,0o600);assert.equal((await fs.stat(vault)).mode&0o777,0o700);
 const log=await db.nhat_ky_hoat_dong.findFirstOrThrow({where:{company_id:manager.company_id,doi_tuong_id:`ket_noi_ai:${row.id}`,hanh_dong:'CREATE'}});
 assert.equal(log.du_lieu_moi.keyVersion,1);assert(!JSON.stringify(log).includes(key1));assert(!JSON.stringify(log).includes(row.tham_chieu_bi_mat));
});

test('blank key preserves secret; rotation changes version, stale saves cannot overwrite',async()=>{
 let before=await current();const old=before.updated_at.toISOString();
 let r=await save({version:old,apiKey:'',model:'test-model-two',enabled:true});assert(r.success,r.message);
 let row=await current();assert.equal(row.tham_chieu_bi_mat,before.tham_chieu_bi_mat);assert.equal(row.phien_ban_khoa,1);
 assert.equal((await save({version:old,apiKey:key2,model:'stale-model',enabled:true})).success,false);
 r=await save({version:row.updated_at.toISOString(),apiKey:key2,model:'test-model-three',enabled:true});assert(r.success,r.message);
 row=await current();assert.notEqual(row.tham_chieu_bi_mat,before.tham_chieu_bi_mat);assert.equal(row.phien_ban_khoa,2);
 assert.equal(await readAiSecret(manager.company_id,row.tham_chieu_bi_mat),key2);assert.equal(await readAiSecret(manager.company_id,before.tham_chieu_bi_mat),key1);
 const version=row.updated_at.toISOString();const concurrent=await Promise.all([save({version,apiKey:'',model:'winner-a',enabled:true}),save({version,apiKey:'',model:'winner-b',enabled:true})]);assert.equal(concurrent.filter(x=>x.success).length,1);
});

test('model listing is GET-only, strips private fields, uses saved or new key without replacing configuration',async()=>{
 const before=await current();transport=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/models');assert.equal(options.method??'GET','GET');assert.equal(options.headers.Authorization,`Bearer ${key2}`);return json({data:[{id:'test-model-three',private:'secret'},{id:'other-model'},{id:'bad id'},{id:key2}]});};
 let r=await as(manager,()=>testAiKey({version:before.updated_at.toISOString(),apiKey:''}));assert(r.success,r.message);assert.deepEqual(r.models,['other-model','test-model-three']);assert(!JSON.stringify(r).includes('secret'));
 transport=async(url,options)=>{assert.equal(options.headers.Authorization,`Bearer ${key1}`);return new Response('SECRET-PROVIDER-BODY',{status:401});};
 r=await as(manager,()=>testAiKey({version:before.updated_at.toISOString(),apiKey:key1}));assert.equal(r.success,false);assert(!r.message.includes('SECRET'));
 assert.deepEqual(await current(),before);
});

test('pause never falls back to environment; chat uses saved key/model and observes changes between calls',async()=>{
 process.env.OPENAI_API_KEY='sk-test-fallback-must-not-be-used';process.env.OPENAI_MODEL='fallback-model';
 let row=await current();assert((await save({version:row.updated_at.toISOString(),apiKey:'',model:'selected-model',enabled:false})).success);
 const beforeCalls=calls;let r=await as(manager,()=>askAi({requestId:randomUUID(),message:'test'}));assert.equal(r.success,false);assert.match(r.message,/tạm dừng/);assert.equal(calls,beforeCalls);
 row=await current();assert((await save({version:row.updated_at.toISOString(),apiKey:'',model:'selected-model',enabled:true})).success);
 transport=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,`Bearer ${key2}`);assert.equal(JSON.parse(options.body).model,'selected-model');return json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Đã dùng cấu hình.'}]}],usage:{input_tokens:10,output_tokens:10}});};
 assert((await as(manager,()=>askAi({requestId:randomUUID(),message:'test'}))).success);
 transport=async()=>{
   const row=await current();await db.ket_noi_ai.update({where:{id:row.id},data:{model_mac_dinh:'changed-model',updated_at:new Date(row.updated_at.getTime()+10)}});
   return json({status:'completed',output:[{type:'function_call',name:'lookup',arguments:'{"kind":"categories"}',call_id:'changed'}],usage:{input_tokens:10,output_tokens:10}});
 };
 const start=calls;r=await as(manager,()=>askAi({requestId:randomUUID(),message:'test'}));assert.equal(r.success,false);assert.match(r.message,/Cài đặt AI đã thay đổi/);assert.equal(calls-start,1);
});

test('vault rejects wrong tenant, tampering and missing master; never regenerates or falls back',async()=>{
 const row=await current(),file=path.join(vault,`${row.tham_chieu_bi_mat}.secret.json`),original=await fs.readFile(file),masterPath=path.join(vault,'master.key'),key=await fs.readFile(masterPath);
 await assert.rejects(()=>readAiSecret(foreignCompany.id,row.tham_chieu_bi_mat));
 const value=JSON.parse(original);value.tag=Buffer.alloc(16).toString('base64');await fs.writeFile(file,JSON.stringify(value));await assert.rejects(()=>readAiConnection(manager.company_id));await fs.writeFile(file,original);
 await fs.unlink(masterPath);await assert.rejects(()=>readAiConnection(manager.company_id));await assert.rejects(()=>storeAiSecret(manager.company_id,key1));await assert.rejects(()=>fs.stat(masterPath));
 await fs.writeFile(masterPath,key,{mode:0o600});assert.equal((await readAiConnection(manager.company_id)).apiKey,key2);
 await assert.rejects(()=>readAiSecret(manager.company_id,'../master.key'));
});

test('audit failure rolls back connection change and keeps previous usable secret',async()=>{
 const before=await current();
 await db.$executeRawUnsafe(`CREATE FUNCTION ai_keys_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.phan_he = 'AI' AND NEW.mo_ta = 'Cập nhật kết nối và model AI' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`);
 await db.$executeRawUnsafe('CREATE TRIGGER ai_keys_test_audit_failure BEFORE INSERT ON nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_keys_test_audit_failure()');
 try{assert.equal((await save({version:before.updated_at.toISOString(),apiKey:key1,model:'must-rollback',enabled:true})).success,false);assert.deepEqual(await current(),before);assert.equal((await readAiConnection(manager.company_id)).apiKey,key2);}
 finally{await db.$executeRawUnsafe('DROP TRIGGER ai_keys_test_audit_failure ON nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION ai_keys_test_audit_failure()');}
});

test('permission loss during key test does not return models; test rate limit denies before HTTP',async()=>{
 let row=await current();transport=async()=>{await db.vai_tro_quyen.delete({where:{role_id_permission_id:{role_id:role.id,permission_id:grant.id}}});return json({data:[{id:'private-model'}]});};
 const r=await as(manager,()=>testAiKey({version:row.updated_at.toISOString(),apiKey:''}));assert.equal(r.success,false);assert(!JSON.stringify(r).includes('private-model'));
 assert.equal((await as(manager,getAiSettings)).success,false);
 await db.vai_tro_quyen.create({data:{role_id:role.id,permission_id:grant.id}});
 await db.nhat_ky_hoat_dong.createMany({data:Array.from({length:10},()=>({company_id:manager.company_id,account_id:manager.id,ten_dang_nhap:manager.ten_dang_nhap,ho_ten:'Test',phan_he:'AI',hanh_dong:'AI_KEY_TEST',mo_ta:'Rate fixture'}))});
 row=await current();const before=calls;assert.equal((await as(manager,()=>testAiKey({version:row.updated_at.toISOString(),apiKey:''}))).success,false);assert.equal(calls,before);
 const logs=await db.nhat_ky_hoat_dong.findMany({where:{company_id:manager.company_id,phan_he:'AI'}});for(const key of [key1,key2,process.env.OPENAI_API_KEY])assert(!JSON.stringify(logs).includes(key));
});
