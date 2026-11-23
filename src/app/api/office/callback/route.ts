import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { officeActor, officeSource } from '@/lib/office-access';
import { boundedOfficeBytes, officeResultUrl, officeUploadId, readOfficeSession, verifyOfficeCallback } from '@/lib/office-editor';
import { parseAttachment, fileSummary, safeAttachmentName } from '@/lib/ai-attachment-parser';
import { writeAttachment, removeAttachmentBytes } from '@/lib/ai-attachment-storage';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  let key: string | null = null;
  try {
    const data = await readOfficeSession(new URL(request.url).searchParams.get('ticket') || '', 'callback');
    // Bound even chunked bodies before parsing untrusted JSON.
    const raw = await boundedOfficeBytes(new Response(request.body), 65536);
    const body = JSON.parse(raw.toString());
    const token = request.headers.get('authorization')?.replace(/^Bearer /i, '') || body.token;
    const callback = await verifyOfficeCallback(z.string().max(60000).parse(token));
    if (callback.key !== data.id) throw Error();
    const actor = await officeActor(data), file = await db.$transaction(tx => officeSource(tx, data, actor, [2,6].includes(callback.status)));
    if (![2,6].includes(callback.status)) return Response.json({ error: 0 });
    if (!callback.url || !['docx','xlsx'].includes(file.loai_tep) || (callback.filetype && callback.filetype !== file.loai_tep)) throw Error();
    const response = await fetch(officeResultUrl(callback.url), { redirect: 'error', signal: AbortSignal.timeout(20000), cache: 'no-store' });
    const bytes = await boundedOfficeBytes(response), hash = createHash('sha256').update(bytes).digest('hex');
    const requestId = z.string().uuid().optional().parse(callback.userdata);
    const uploadId = officeUploadId(data.id, requestId || hash);
    const filename = safeAttachmentName(file.ten_tep.replace(/\.(docx|xlsx)$/i, '') + ` - đã sửa.${file.loai_tep}`);
    const parsed = await parseAttachment(bytes, filename);
    key = randomUUID(); await writeAttachment(key, bytes, parsed.data, parsed.preview); const storedKey = key;
    const stored = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${data.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${data.companyId}::int)`;
      await officeSource(tx, data, actor, true);
      const owner = { company_id: data.companyId, account_id: data.userId };
      const existing = await tx.tep_dinh_kem_ai.findFirst({ where: { ...owner, ma_tai_len: uploadId } });
      if (existing) {
        const prior = z.object({ sha256: z.string() }).parse(existing.tom_tat);
        if (prior.sha256 !== hash) throw Error('Callback request reused with different content');
        return existing;
      }
      const size = await tx.tep_dinh_kem_ai.aggregate({ where: owner, _sum: { dung_luong: true } });
      if ((size._sum.dung_luong || 0) + bytes.length > 200*1024*1024 || await tx.tep_dinh_kem_ai.count({ where: { ...owner, hoi_thoai_id: data.chatId } }) >= 20) throw Error('File quota');
      // Complete a paired turn so the existing history/context pipeline sees the new version.
      await tx.tin_nhan_ai.create({ data: { company_id: data.companyId, hoi_thoai_id: data.chatId, ma_yeu_cau: uploadId, vai_tro: 'NGUOI_DUNG', trang_thai: 'HOAN_TAT', noi_dung: `Lưu bản chỉnh sửa của ${file.ten_tep}.` } });
      const answer = await tx.tin_nhan_ai.create({ data: { company_id: data.companyId, hoi_thoai_id: data.chatId, ma_yeu_cau: uploadId, vai_tro: 'TRO_LY', trang_thai: 'HOAN_TAT', noi_dung: `Đã lưu bản mới: ${filename}. Bản gốc được giữ nguyên.`, du_lieu_kem_theo: { version: 1, ngu_canh: [] } } });
      const row = await tx.tep_dinh_kem_ai.create({ data: { ...owner, hoi_thoai_id: data.chatId, tin_nhan_id: answer.id, ma_tai_len: uploadId, khoa_luu_tru: storedKey, ten_tep: filename, loai_tep: parsed.data.kind, dung_luong: bytes.length, tom_tat: { ...fileSummary(parsed.data), generated: true, note: 'Bản chỉnh sửa trong trình soạn thảo.', sourceIds: [file.id], operation: 'office_edit', officeSession: data.id, officeRequest: requestId ?? null, sha256: hash } } });
      await tx.tin_nhan_ai.update({ where: { id: answer.id }, data: { du_lieu_kem_theo: { version: 1, ngu_canh: [{ tool: 'office_edit', filters: {}, references: [{ kind: 'files', ids: [file.id, row.id] }] }] } } });
      await tx.hoi_thoai_ai.update({ where: { id: data.chatId }, data: { updated_at: new Date() } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...owner, ten_dang_nhap: actor.username, ho_ten: actor.fullName, phan_he: 'AI', hanh_dong: 'AI_FILE_CREATE', doi_tuong_id: `tep_dinh_kem_ai:${row.id}`, mo_ta: 'Lưu bản tài liệu chỉnh sửa trong Office web.', du_lieu_moi: { sourceId: file.id, fileId: row.id, bytes: bytes.length } } });
      return row;
    });
    if (stored.khoa_luu_tru !== key) await removeAttachmentBytes(key);
    key = null;
    return Response.json({ error: 0 });
  } catch {
    if (key) await removeAttachmentBytes(key).catch(() => undefined);
    return Response.json({ error: 1 }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
