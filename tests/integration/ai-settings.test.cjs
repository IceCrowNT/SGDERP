/* eslint-disable @typescript-eslint/no-require-imports -- Real DB, crypto and auth; only request context and OpenAI HTTP are mocked. */
const assert=require('node:assert/strict');
const {test,before,after}=require('node:test');
const {AsyncLocalStorage}=require('node:async_hooks');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises'),path=require('node:path'),Module=require('node:module');
assert.match(new URL(process.env.DATABASE_URL).pathname,/^\/sdg_(?:ai_keys|system_settings)_test_\d+$/);
const request=new AsyncLocalStorage(),load=Module._load;
Module._load=function(name,...args){
 if(name==='next/headers')return {cookies:async()=>({get:()=>request.getStore()?{value:request.getStore()}:undefined})};
 if(name==='next/cache')return {revalidatePath(){}};
 return load.call(this,name,...args);
};
const {db}=require('../../src/lib/db.ts');
const {createSessionToken}=require('../../src/lib/session-token.ts');
const {getAiSettings,saveAiSettings,testAiKey: testKeyAction,getAiConnections,setDefaultAiConnection}=require('../../src/actions/ai-settings.ts');
const {askAi}=require('../../src/actions/ai.ts');
const {readAiConnection}=require('../../src/lib/ai-connection.ts');
const {readAiSecret,storeAiSecret}=require('../../src/lib/ai-secret-store.ts');
const key1='sk-test-key-settings-FIRST-1111',key2='sk-test-key-settings-SECOND-2222';
const as=async(account,fn)=>request.run(account?await createSessionToken({userId:account.id,companyId:account.company_id,sessionVersion:account.phien_ban_dang_nhap}):undefined,fn);
const current=()=>db.ket_noi_ai.findFirstOrThrow({where:{company_id:manager.company_id,la_mac_dinh:true}});
const save=async(values)=>{const row=await db.ket_noi_ai.findFirst({where:{company_id:manager.company_id,la_mac_dinh:true}});return as(manager,()=>saveAiSettings({target:row?.id??'new',name:row?.ten_ket_noi??'Main key',...values}));};
const testAiKey=async(values)=>testKeyAction({target:(await current()).id,...values});
const json=data=>new Response(JSON.stringify(data),{status:200});
let manager,other,foreignCompany,role,grant,vault,originalFetch,calls=0,transport,operator,operatorRole,foreignOperator;
before(async()=>{
 const run=randomUUID().slice(0,8),company=await db.cong_ty.create({data:{ten_cong_ty:`AI keys ${run}`}});
 const permissions=await db.quyen.findMany({where:{OR:[{phan_he:{in:['ROLES','ACCOUNTS','ASSETS','LOCATIONS']},hanh_dong:'MANAGE',pham_vi:'ALL'},{phan_he:'AI',hanh_dong:'MANAGE_CONNECTIONS',pham_vi:'ALL'}]}});assert.equal(permissions.length,5);grant=permissions.find(p=>p.phan_he==='AI');
 role=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'AI_KEYS',ten_vai_tro:'Keys',danh_sach_quyen:{create:permissions.map(p=>({permission_id:p.id}))}}});
 const oldAdminRole=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'ADMIN',ten_vai_tro:'Admin without AI',danh_sach_quyen:{create:permissions.filter(p=>p.id!==grant.id).map(p=>({permission_id:p.id}))}}});
 for(const name of ['manager','other']){const a=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:`ai-key-${name}-${run}`,ten_hien_thi:name,mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:name==='manager'?role.id:oldAdminRole.id}}}});if(name==='manager')manager=a;else other=a;}
 foreignCompany=await db.cong_ty.create({data:{ten_cong_ty:`Other keys ${run}`}});
 operatorRole=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'AI_OPERATOR',ten_vai_tro:'AI only',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 operator=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:`ai-operator-${run}`,ten_hien_thi:'AI operator',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:operatorRole.id}}}});
 const foreignRole=await db.vai_tro.create({data:{company_id:foreignCompany.id,ma_vai_tro:'AI_OPERATOR',ten_vai_tro:'Foreign AI',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 foreignOperator=await db.tai_khoan.create({data:{company_id:foreignCompany.id,ten_dang_nhap:`ai-foreign-${run}`,ten_hien_thi:'Foreign AI',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:foreignRole.id}}}});
 process.env.AI_PILOT_ACCOUNT_ID=String(manager.id);process.env.OPENAI_API_KEY='';process.env.OPENAI_MODEL='';
 const base=path.resolve('outputs/ai-settings');await fs.mkdir(base,{recursive:true});vault=await fs.mkdtemp(path.join(base,'vault-'));process.env.AI_SECRET_STORAGE_DIR=vault;
 originalFetch=global.fetch;global.fetch=async(url,options)=>{calls++;assert(['https://api.openai.com/v1/models','https://api.openai.com/v1/responses'].includes(url));assert.equal(options.redirect,'error');assert(transport,'Unexpected network request');return transport(url,options);};
});
after(async()=>{global.fetch=originalFetch;await db.$disconnect();});

test('only current AI grants allow settings; pilot/admin/asset privileges do not substitute for them',async()=>{
 for(const a of [null,other]){assert.equal((await as(a,getAiSettings)).success,false);assert.equal((await as(a,()=>saveAiSettings({target:'new',name:'Test connection',version:null,apiKey:key1,model:'test-model',enabled:true}))).success,false);}
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
 await db.$executeRawUnsafe('CREATE TRIGGER ai_keys_test_audit_failure BEFORE INSERT ON he_thong.nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_keys_test_audit_failure()');
 try{assert.equal((await save({version:before.updated_at.toISOString(),apiKey:key1,model:'must-rollback',enabled:true})).success,false);assert.deepEqual(await current(),before);assert.equal((await readAiConnection(manager.company_id)).apiKey,key2);}
 finally{await db.$executeRawUnsafe('DROP TRIGGER ai_keys_test_audit_failure ON he_thong.nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION ai_keys_test_audit_failure()');}
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


test('AI-only manager is independent of chat and RBAC; company cannot adopt another company environment key',async()=>{
 const previousCalls=calls;
 assert((await as(operator,getAiSettings)).success);
 assert.equal((await as(operator,()=>askAi({requestId:randomUUID(),message:'test'}))).success,false);
 const {getRoles}=require('../../src/actions/role.ts');assert.equal((await as(operator,getRoles)).success,false);
 const foreign=await as(foreignOperator,getAiSettings);assert(foreign.success);assert.equal(foreign.settings.hasKey,false);assert.equal(foreign.settings.model,'');assert.equal(foreign.settings.maskedKey,null);
 assert.equal((await as(foreignOperator,()=>saveAiSettings({target:'new',name:'Test connection',version:null,apiKey:'',model:'foreign-model',enabled:true}))).success,false);
 assert.equal((await as(foreignOperator,()=>testKeyAction({target:'new',version:null,apiKey:''}))).success,false);
 assert.equal(calls,previousCalls);
 const before=await current();assert((await as(foreignOperator,()=>saveAiSettings({target:'new',name:'Test connection',version:null,apiKey:key1,model:'foreign-model',enabled:true}))).success);
 assert.deepEqual(await current(),before);assert.equal((await readAiConnection(foreignCompany.id)).model,'foreign-model');
});

test('role matrix grants/revokes AI immediately and old payload preserves the action',async()=>{
 const {saveRole,getRoles,assignAccountRoles}=require('../../src/actions/role.ts');
 const payload=async(ai)=>{const row=await db.vai_tro.findUniqueOrThrow({where:{id:operatorRole.id}});return {id:row.id,version:row.updated_at.toISOString(),code:row.ma_vai_tro,name:row.ten_vai_tro,description:'',permissions:{HR:'NONE',ACCOUNTS:'NONE',ROLES:'NONE',AUDIT:'NONE'},...(ai===undefined?{}:{aiActions:ai})};};
 assert((await as(manager,async()=>saveRole(await payload(undefined)))).success);
 assert((await as(operator,getAiSettings)).success);
 let list=await as(manager,getRoles);assert(list.success);assert.deepEqual(list.roles.find(r=>r.id===operatorRole.id).aiActions,['MANAGE_CONNECTIONS']);
 assert((await as(manager,async()=>saveRole(await payload([])))).success);assert.equal((await as(operator,getAiSettings)).success,false);
 assert((await as(manager,async()=>saveRole(await payload(['MANAGE_CONNECTIONS'])))).success);assert((await as(operator,getAiSettings)).success);
 const row=await db.tai_khoan.findUniqueOrThrow({where:{id:operator.id}});assert((await as(manager,()=>assignAccountRoles({accountId:operator.id,roleIds:[],version:row.updated_at.toISOString()}))).success);assert.equal((await as(operator,getAiSettings)).success,false);
});

test('adding keys preserves previous secrets/default; lists and key tests are scoped to the selected connection',async()=>{
 const before=await current();
 const r=await as(manager,()=>saveAiSettings({target:'new',name:'Second independent key',version:null,apiKey:key1,model:'second-model',enabled:true}));assert(r.success,r.message);
 assert.notEqual(r.settings.target,before.id);assert.equal(r.settings.isDefault,false);assert.deepEqual(await current(),before);
 const second=await db.ket_noi_ai.findUniqueOrThrow({where:{id:r.settings.target}});
 assert.equal(await readAiSecret(manager.company_id,second.tham_chieu_bi_mat),key1);assert.equal((await readAiConnection(manager.company_id)).apiKey,key2);
 const list=await as(manager,getAiConnections);assert(list.success);assert.equal(list.connections.length,2);assert.equal(list.connections.filter(r=>r.isDefault).length,1);assert(!JSON.stringify(list).includes(key1));
 await db.nhat_ky_hoat_dong.deleteMany({where:{company_id:manager.company_id,hanh_dong:'AI_KEY_TEST'}});
 transport=async(url,options)=>{assert.equal(options.headers.Authorization,`Bearer ${key1}`);return json({data:[{id:'second-model'}]});};
 assert.deepEqual((await as(manager,()=>testKeyAction({target:second.id,version:second.updated_at.toISOString(),apiKey:''}))).models,['second-model']);
 const callsBefore=calls;
 for(const op of [()=>getAiSettings(second.id),()=>testKeyAction({target:second.id,version:second.updated_at.toISOString(),apiKey:''}),()=>saveAiSettings({target:second.id,name:'Stolen',version:second.updated_at.toISOString(),apiKey:key2,model:'stolen-model',enabled:true}),()=>setDefaultAiConnection({id:second.id,version:second.updated_at.toISOString(),expectedDefault:list.defaultStamp})])assert.equal((await as(foreignOperator,op)).success,false);
 assert.equal(calls,callsBefore);assert.deepEqual(await current(),before);
});

test('default switch is explicit, concurrent stale switches fail and DB enforces only one default',async()=>{
 const old=await current(),list=await as(manager,getAiConnections),second=list.connections.find(r=>!r.isDefault);
 const input={id:second.target,version:second.version,expectedDefault:list.defaultStamp};
 const switched=await as(manager,()=>setDefaultAiConnection(input));assert(switched.success,switched.message);
 assert.equal((await readAiConnection(manager.company_id)).model,second.model);assert.equal((await readAiConnection(manager.company_id)).apiKey,key1);
 assert.equal((await as(manager,()=>setDefaultAiConnection(input))).success,false);
 const updatedOld=await db.ket_noi_ai.findUniqueOrThrow({where:{id:old.id}});
 assert.equal(updatedOld.tham_chieu_bi_mat,old.tham_chieu_bi_mat);assert.equal(updatedOld.la_mac_dinh,false);
 await assert.rejects(()=>db.ket_noi_ai.update({where:{id:old.id},data:{la_mac_dinh:true}}));
 const next=await as(manager,()=>saveAiSettings({target:'new',name:'Third key',version:null,apiKey:key2,model:'third-model',enabled:true}));assert(next.success);
 const currentList=await as(manager,getAiConnections);
 const contenders=[updatedOld.id,next.settings.target];
 const results=await Promise.all(contenders.map(async id=>{const row=await db.ket_noi_ai.findUniqueOrThrow({where:{id}});return as(manager,()=>setDefaultAiConnection({id,version:row.updated_at.toISOString(),expectedDefault:currentList.defaultStamp}));}));
 assert.equal(results.filter(r=>r.success).length,1);assert.equal(await db.ket_noi_ai.count({where:{company_id:manager.company_id,la_mac_dinh:true}}),1);
 const active=await current();assert((await save({version:active.updated_at.toISOString(),apiKey:'',model:active.model_mac_dinh,enabled:false})).success);
 await assert.rejects(()=>readAiConnection(manager.company_id),/tạm dừng/);
 const paused=await current(),pausedList=await as(manager,getAiConnections);
 assert.equal((await as(manager,()=>setDefaultAiConnection({id:paused.id,version:paused.updated_at.toISOString(),expectedDefault:pausedList.defaultStamp}))).success,false);
 await db.ket_noi_ai.update({where:{id:paused.id},data:{la_mac_dinh:false}});
 await assert.rejects(()=>readAiConnection(manager.company_id),/Chưa chọn/);
});

test('adding first new key preserves environment key/model and managed connections work without environment',async()=>{
 const company=await db.cong_ty.create({data:{ten_cong_ty:'Environment migration '+randomUUID()}});
 const role=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'AI',ten_vai_tro:'AI',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 const account=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:'ai-env-'+randomUUID(),ten_hien_thi:'Environment',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 const original={account:process.env.AI_PILOT_ACCOUNT_ID,key:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL};
 try{
  process.env.AI_PILOT_ACCOUNT_ID=String(account.id);process.env.OPENAI_API_KEY=key1;process.env.OPENAI_MODEL='environment-model';
  const initial=await as(account,getAiConnections);assert.equal(initial.connections[0].target,'environment');
  assert.equal((await as(account,()=>saveAiSettings({target:'environment',name:'Unsafe replacement',version:null,apiKey:key2,model:'environment-model',enabled:true}))).success,false);
  // Audit failure must roll back both the environment import and the new connection.
  await db.$executeRawUnsafe(`CREATE FUNCTION ai_multi_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.company_id = ${company.id} AND NEW.mo_ta = 'Cập nhật kết nối và model AI' THEN RAISE EXCEPTION 'test'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER ai_multi_test_fail BEFORE INSERT ON he_thong.nhat_ky_hoat_dong FOR EACH ROW EXECUTE FUNCTION ai_multi_test_fail()');
  const input={target:'new',name:'New API key',version:null,apiKey:key2,model:'new-model',enabled:true};
  try{assert.equal((await as(account,()=>saveAiSettings(input))).success,false);assert.equal(await db.ket_noi_ai.count({where:{company_id:company.id}}),0);assert.equal((await readAiConnection(company.id)).source,'environment');}
  finally{await db.$executeRawUnsafe('DROP TRIGGER ai_multi_test_fail ON he_thong.nhat_ky_hoat_dong');await db.$executeRawUnsafe('DROP FUNCTION ai_multi_test_fail()');}
  const r=await as(account,()=>saveAiSettings(input));assert(r.success,r.message);
  const rows=await db.ket_noi_ai.findMany({where:{company_id:company.id}});assert.equal(rows.length,2);
  const old=rows.find(r=>r.la_mac_dinh);assert.equal(old.model_mac_dinh,'environment-model');assert.equal(await readAiSecret(company.id,old.tham_chieu_bi_mat),key1);
  assert.equal(process.env.OPENAI_API_KEY,key1);assert.equal((await readAiConnection(company.id)).model,'environment-model');
  process.env.OPENAI_API_KEY='';process.env.OPENAI_MODEL='';assert.equal((await readAiConnection(company.id)).apiKey,key1);
  assert.equal((await as(account,()=>getAiSettings('environment'))).success,false);
  const list=await as(account,getAiConnections);assert((await as(account,()=>setDefaultAiConnection({id:r.settings.target,version:r.settings.version,expectedDefault:list.defaultStamp}))).success);
  assert.equal((await readAiConnection(company.id)).apiKey,key2);
 }finally{process.env.AI_PILOT_ACCOUNT_ID=original.account;process.env.OPENAI_API_KEY=original.key;process.env.OPENAI_MODEL=original.model;}
});

test('explicit environment import stores the existing key without replacing it and stale import fails',async()=>{
 const company=await db.cong_ty.create({data:{ten_cong_ty:'Import environment '+randomUUID()}});
 const role=await db.vai_tro.create({data:{company_id:company.id,ma_vai_tro:'AI',ten_vai_tro:'AI',danh_sach_quyen:{create:{permission_id:grant.id}}}});
 const account=await db.tai_khoan.create({data:{company_id:company.id,ten_dang_nhap:'ai-import-'+randomUUID(),ten_hien_thi:'Import',mat_khau_bam:'disabled',danh_sach_vai_tro:{create:{role_id:role.id}}}});
 const original={account:process.env.AI_PILOT_ACCOUNT_ID,key:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL};
 try{
  process.env.AI_PILOT_ACCOUNT_ID=String(account.id);process.env.OPENAI_API_KEY=key1;process.env.OPENAI_MODEL='environment-model';
  const input={target:'environment',name:'Key hiện tại',version:null,apiKey:'',model:'environment-model',enabled:true};
  const r=await as(account,()=>saveAiSettings(input));assert(r.success,r.message);assert(r.settings.isDefault);assert.equal(r.settings.source,'managed');
  assert.equal(await db.ket_noi_ai.count({where:{company_id:company.id}}),1);assert.equal((await as(account,()=>saveAiSettings(input))).success,false);
  process.env.OPENAI_API_KEY='';process.env.OPENAI_MODEL='';assert.equal((await readAiConnection(company.id)).apiKey,key1);assert.equal((await readAiConnection(company.id)).model,'environment-model');
 }finally{process.env.AI_PILOT_ACCOUNT_ID=original.account;process.env.OPENAI_API_KEY=original.key;process.env.OPENAI_MODEL=original.model;}
});
