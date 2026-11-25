'use server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { officeActor, officeSource } from '@/lib/office-access';
import { OfficeError, officeEnvironment, readOfficeSession, signOfficePayload, signOfficeSession, type OfficeSessionData } from '@/lib/office-editor';
import { attachmentView } from '@/lib/ai-attachment-storage';
const fail = (e: unknown) => ({ success: false as const, message: e instanceof OfficeError ? e.message : 'Chưa kết nối được tài liệu. Kiểm tra phiên đăng nhập hoặc thử lại.' });
async function clientSession(token: string) {
  const session = await getSession(), data = await readOfficeSession(token, 'client');
  if (!session || session.userId !== data.userId || session.companyId !== data.companyId || session.sessionVersion !== data.version) throw new OfficeError('Phiên chỉnh sửa không thuộc tài khoản hiện tại.');
  return { data, actor: await officeActor(data) };
}
export async function openOfficeEditor(input: unknown) {
  try {
    const v = z.object({ fileId: z.number().int().positive(), chatId: z.number().int().positive(), mobile: z.boolean() }).strict().parse(input);
    const actor = await getSession(); if (!actor) throw Error();
    const env = officeEnvironment();
    const data: OfficeSessionData = { id: randomUUID(), fileId: v.fileId, chatId: v.chatId, userId: actor.userId, companyId: actor.companyId, version: actor.sessionVersion ?? 0, editable: false };
    const file = await db.$transaction(tx => officeSource(tx, data, actor));
    const chat = await db.hoi_thoai_ai.findUniqueOrThrow({ where: { id: v.chatId } });
    if (!['docx','xlsx','pdf','csv'].includes(file.loai_tep)) throw new OfficeError('Định dạng này chưa hỗ trợ trong trình soạn thảo.');
    data.editable = chat.trang_thai === 'DANG_MO' && ['docx','xlsx'].includes(file.loai_tep) && (!v.mobile || process.env.OFFICE_MOBILE_EDIT_ENABLED === 'true');
    const source = await signOfficeSession(data, 'source'), callback = await signOfficeSession(data, 'callback');
    const config = { width: '100%', height: '100%', type: v.mobile ? 'mobile' : 'desktop', documentType: file.loai_tep === 'xlsx' || file.loai_tep === 'csv' ? 'cell' : file.loai_tep === 'pdf' ? 'pdf' : 'word',
      document: { fileType: file.loai_tep, title: file.ten_tep, key: data.id, url: `${env.appUrl}/api/office/source?ticket=${source}`, permissions: { edit: data.editable, download: true, print: true, review: data.editable, comment: data.editable } },
      editorConfig: { mode: data.editable ? 'edit' : 'view', lang: 'vi', callbackUrl: `${env.appUrl}/api/office/callback?ticket=${callback}`, user: { id: String(actor.userId), name: actor.fullName }, customization: { forcesave: false, autosave: true, compactHeader: true, compactToolbar: true, ...(file.loai_tep === 'docx' ? { zoom: -2 } : {}), help: false, feedback: false }, coEditing: { mode: 'strict', change: false } } };
    return { success: true as const, scriptUrl: `${env.publicUrl}/web-apps/apps/api/documents/api.js`, token: await signOfficeSession(data, 'client'), editable: data.editable, viewReason: v.mobile && !data.editable && ['docx','xlsx'].includes(file.loai_tep) ? 'Trên điện thoại hiện chỉ xem tài liệu. Mở trên máy tính để chỉnh sửa.' : '', config: { ...config, token: await signOfficePayload(config) } };
  } catch (e) { return fail(e); }
}
export async function saveOfficeEditor(input: unknown) {
  try {
    const v = z.object({ token: z.string().max(4000), requestId: z.string().uuid() }).strict().parse(input), { data, actor } = await clientSession(v.token);
    await db.$transaction(tx => officeSource(tx, data, actor, true));
    const payload = { c: 'forcesave', key: data.id, userdata: v.requestId, operation: 'command' };
    const response = await fetch(`${officeEnvironment().internalUrl}/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, token: await signOfficePayload(payload) }), signal: AbortSignal.timeout(15000), redirect: 'error', cache: 'no-store' });
    const result = z.object({ error: z.number() }).parse(await response.json());
    if (!response.ok || result.error !== 0) throw new OfficeError(result.error === 4 ? 'Editor chưa gửi thay đổi mới. Chờ vài giây rồi bấm Lưu lại; nội dung vẫn được giữ.' : 'Chưa gửi được lệnh lưu. Giữ tài liệu đang mở và thử lại.');
    return { success: true as const };
  } catch (e) { return fail(e); }
}
export async function officeEditorStatus(input: unknown) {
  try {
    const v = z.object({ token: z.string().max(4000), requestId: z.string().uuid().optional() }).strict().parse(input), { data, actor } = await clientSession(v.token);
    const row = await db.$transaction(async tx => {
      await officeSource(tx, data, actor);
      return tx.tep_dinh_kem_ai.findFirst({ where: { company_id: data.companyId, account_id: data.userId, hoi_thoai_id: data.chatId, AND: [{ tom_tat: { path: ['officeSession'], equals: data.id } }, ...(v.requestId ? [{ tom_tat: { path: ['officeRequest'], equals: v.requestId } }] : [])] }, orderBy: { id: 'desc' } });
    });
    return { success: true as const, file: row ? attachmentView(row) : null };
  } catch (e) { return fail(e); }
}
