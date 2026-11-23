import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

export class OfficeError extends Error {}
export const OfficeSession = z.object({ id: z.string().uuid(), fileId: z.number().int().positive(), chatId: z.number().int().positive(), userId: z.number().int().positive(), companyId: z.number().int().positive(), version: z.number().int().nonnegative(), editable: z.boolean() });
export type OfficeSessionData = z.infer<typeof OfficeSession>;
export function officeEnvironment() {
  const publicUrl = process.env.OFFICE_PUBLIC_URL, internalUrl = process.env.OFFICE_INTERNAL_URL || publicUrl, appUrl = process.env.OFFICE_APP_URL, secret = process.env.OFFICE_JWT_SECRET;
  if (!publicUrl || !internalUrl || !appUrl || !secret || secret.length < 32) throw new OfficeError("Trình soạn thảo chưa được kết nối. Quản trị cần cấu hình dịch vụ Office; bạn vẫn có thể tải tệp xuống.");
  const origin = (value: string) => { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new OfficeError("Địa chỉ dịch vụ Office chưa hợp lệ."); return u.origin; };
  return { publicUrl: origin(publicUrl), internalUrl: origin(internalUrl), appUrl: origin(appUrl), secret: new TextEncoder().encode(secret) };
}
function capabilityKey() { const key = process.env.SESSION_SECRET; if (!key || key.length < 32) throw new OfficeError("Chưa cấu hình khóa phiên."); return createHash('sha256').update(`office-capability-v1:${key}`).digest(); }
export async function signOfficeSession(data: OfficeSessionData, purpose: 'client' | 'source' | 'callback') {
  return new SignJWT(OfficeSession.parse(data)).setProtectedHeader({ alg: 'HS256' }).setIssuer('sdg-office').setAudience(purpose).setIssuedAt().setExpirationTime('8h').sign(capabilityKey());
}
export async function readOfficeSession(token: string, purpose: 'client' | 'source' | 'callback') {
  const { payload } = await jwtVerify(token, capabilityKey(), { algorithms: ['HS256'], issuer: 'sdg-office', audience: purpose });
  return OfficeSession.parse(payload);
}
export async function signOfficePayload(payload: Record<string, unknown>) { return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(officeEnvironment().secret); }
// Use ONLY the signed body: unsigned callback fields must never select a download URL.
export async function verifyOfficeCallback(token: string) {
  const { payload } = await jwtVerify(token, officeEnvironment().secret, { algorithms: ['HS256'] });
  const body = payload.payload ?? payload;
  const value = z.object({ key: z.string(), status: z.number().int(), url: z.string().url().optional(), filetype: z.string().optional(), userdata: z.string().max(100).optional(), operation: z.literal('callback').optional() }).parse(body);
  if (payload.operation && payload.operation !== 'callback') throw new OfficeError('Chữ ký callback không hợp lệ.');
  return value;
}
export function officeResultUrl(raw: string) {
  const env = officeEnvironment(), url = new URL(raw);
  if (![env.publicUrl, env.internalUrl].includes(url.origin) || url.username || url.password || !url.pathname.startsWith('/cache/files/') || /%2f|%5c|%2e/i.test(url.pathname)) throw new OfficeError('Địa chỉ tệp kết quả không hợp lệ.');
  return `${env.internalUrl}${url.pathname}${url.search}`;
}
export async function boundedOfficeBytes(response: Response, limit = 10 * 1024 * 1024) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > limit) throw new OfficeError('Không tải được bản lưu hoặc tệp vượt 10 MiB.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new OfficeError('Tệp kết quả vượt 10 MiB.'); chunks.push(value); } }
  finally { await reader.cancel(); }
  if (!size) throw new OfficeError('Tệp kết quả rỗng.');
  return Buffer.concat(chunks);
}
export function officeUploadId(sessionId: string, hash: string) { const h = createHash('sha256').update(`${sessionId}:${hash}`).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; }
