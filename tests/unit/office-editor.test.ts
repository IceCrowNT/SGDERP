import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { SignJWT } from 'jose';
import { signOfficeSession, readOfficeSession, signOfficePayload, verifyOfficeCallback, officeResultUrl, boundedOfficeBytes, officeUploadId } from '../../src/lib/office-editor';
process.env.SESSION_SECRET='test-session-key-not-a-real-secret-123456789';
process.env.OFFICE_JWT_SECRET='test-office-key-not-a-real-secret-123456789';
process.env.OFFICE_PUBLIC_URL='https://office.example.test';
process.env.OFFICE_INTERNAL_URL='http://office:80';
process.env.OFFICE_APP_URL='https://erp.example.test';
const session={id:randomUUID(),fileId:1,chatId:2,userId:3,companyId:4,version:0,editable:true};
test('capabilities bind purpose, expire and reject tampering',async()=>{
 const token=await signOfficeSession(session,'source');assert.deepEqual(await readOfficeSession(token,'source'),session);
 await assert.rejects(readOfficeSession(token,'callback'));await assert.rejects(readOfficeSession(token+'bad','source'));
 const expired=await new SignJWT(session).setProtectedHeader({alg:'HS256'}).setExpirationTime(1).setIssuer('sdg-office').setAudience('source').sign(createHash('sha256').update(`office-capability-v1:${process.env.SESSION_SECRET}`).digest());
 await assert.rejects(readOfficeSession(expired,'source'));
});
test('callback reads only signed payload and rejects editor/command token',async()=>{
 const expected={key:session.id,status:6,url:'https://office.example.test/cache/files/a/output.docx'};
 assert.deepEqual(await verifyOfficeCallback(await signOfficePayload({payload:expected})),expected);
 assert.deepEqual(await verifyOfficeCallback(await signOfficePayload(expected)),expected);
 await assert.rejects(verifyOfficeCallback(await signOfficePayload({document:{key:session.id}})));
 await assert.rejects(verifyOfficeCallback(await signOfficePayload({...expected,operation:'command'})));
});
test('result fetch is pinned to configured Office cache, disallows foreign URLs/credentials/encoded traversal',()=>{
 assert.equal(officeResultUrl('https://office.example.test/cache/files/a/output.docx?md5=test'),'http://office/cache/files/a/output.docx?md5=test');
 for(const url of ['http://169.254.169.254/cache/files/a','https://office.example.test.evil/cache/files/a','https://u:p@office.example.test/cache/files/a','https://office.example.test/api/secret','https://office.example.test/cache/files/%2fsecret','https://office.example.test/cache/files/../../secret']) assert.throws(()=>officeResultUrl(url));
});
test('download stream is bounded including absent Content-Length; idempotency UUID stable',async()=>{
 assert.equal((await boundedOfficeBytes(new Response('hello'),5)).toString(),'hello');
 await assert.rejects(boundedOfficeBytes(new Response('hello!'),5));await assert.rejects(boundedOfficeBytes(new Response(''),5));
 assert.equal(officeUploadId(session.id,'hash'),officeUploadId(session.id,'hash'));assert.notEqual(officeUploadId(session.id,'hash'),officeUploadId(randomUUID(),'hash'));
});
