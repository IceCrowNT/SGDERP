"use server";
import { AI_LIMITS } from "@/lib/ai-config";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canUseAiChat } from "@/lib/ai-pilot";
import { currentAccountActor } from "@/lib/rbac-server";
import { AttachmentError, fileSummary, parseAttachment, safeAttachmentName } from "@/lib/ai-attachment-parser";
import { attachmentView, removeAttachmentBytes, writeAttachment } from "@/lib/ai-attachment-storage";

export async function uploadAiAttachment(form: FormData) {
  let key: string | null = null;
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) throw new AttachmentError("Bạn chưa có quyền dùng tệp trong AI.");
    if ([...form.keys()].some(k => k !== "file" && k !== "uploadId")) throw new AttachmentError("Dữ liệu tải tệp không hợp lệ.");
    const uploadId = z.string().uuid().parse(form.get("uploadId")), file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > AI_LIMITS.files.maxBytes) throw new AttachmentError(`Mỗi tệp phải từ 1 byte đến ${AI_LIMITS.files.maxBytes / 1024 / 1024} MiB.`);
    const name = safeAttachmentName(file.name), buffer = Buffer.from(await file.arrayBuffer()), hash = createHash("sha256").update(buffer).digest("hex");
    const { data, preview } = await parseAttachment(buffer, name);
    key = randomUUID(); await writeAttachment(key, buffer, data, preview);
    const storedKey = key;
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session); if (!canUseAiChat({ ...session, permissions: current.permissions })) throw new AttachmentError("Quyền AI đã thay đổi.");
      const owner = { company_id: session.companyId, account_id: session.userId };
      const previous = await tx.tep_dinh_kem_ai.findFirst({ where: { ...owner, ma_tai_len: uploadId } });
      if (previous) {
        const old = z.object({ sha256: z.string() }).safeParse(previous.tom_tat);
        if (!old.success || old.data.sha256 !== hash || previous.ten_tep !== name) throw new AttachmentError("Mã tải tệp đã được dùng cho tệp khác.");
        return previous;
      }
      const size = await tx.tep_dinh_kem_ai.aggregate({ where: owner, _sum: { dung_luong: true } });
      if ((size._sum.dung_luong ?? 0) + file.size > AI_LIMITS.files.storageBytes) throw new AttachmentError(`Kho tệp AI của bạn đã đạt giới hạn ${AI_LIMITS.files.storageBytes / 1024 / 1024} MiB.`);
      if (await tx.tep_dinh_kem_ai.count({ where: { ...owner, tin_nhan_id: null } }) >= AI_LIMITS.files.maxPending) throw new AttachmentError(`Đang có ${AI_LIMITS.files.maxPending} tệp chưa gửi. Bỏ các tệp không dùng trước khi tải thêm.`);
      const row = await tx.tep_dinh_kem_ai.create({ data: { ...owner, ma_tai_len: uploadId, ten_tep: name, loai_tep: data.kind, dung_luong: buffer.length, khoa_luu_tru: storedKey, tom_tat: { ...fileSummary(data), sha256: hash } } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...owner, ten_dang_nhap: session.username, ho_ten: session.fullName, phan_he: "AI", hanh_dong: "AI_FILE_UPLOAD", doi_tuong_id: `tep_dinh_kem_ai:${row.id}`, mo_ta: "Tải tệp riêng cho hội thoại AI.", du_lieu_moi: { bytes: buffer.length, kind: data.kind } } });
      return row;
    });
    if (result.khoa_luu_tru !== key) await removeAttachmentBytes(key); key = null;
    return { success: true as const, file: attachmentView(result) };
  } catch (error) {
    if (key) await removeAttachmentBytes(key).catch(() => undefined);
    return { success: false as const, message: error instanceof AttachmentError ? error.message : "Chưa tải được tệp. Kiểm tra định dạng hoặc thử lại." };
  }
}
export async function removeAiAttachment(input: unknown) {
  try {
    const id = z.object({ id: z.number().int().positive() }).strict().parse(input).id;
    const session = await getSession(); if (!session || !canUseAiChat(session)) throw Error();
    const key = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM chung.cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session); if (!canUseAiChat({ ...session, permissions: current.permissions })) throw Error();
      const owner = { company_id: session.companyId, account_id: session.userId };
      const row = await tx.tep_dinh_kem_ai.findFirst({ where: { ...owner, id } });
      if (!row) return null;
      if (row.tin_nhan_id !== null) throw new AttachmentError("Tệp đã gắn vào tin nhắn; không thể bỏ như tệp đang soạn.");
      await tx.tep_dinh_kem_ai.delete({ where: { id } });
      await tx.nhat_ky_hoat_dong.create({ data: { ...owner, ten_dang_nhap: session.username, ho_ten: session.fullName, phan_he: "AI", hanh_dong: "AI_FILE_REMOVE", doi_tuong_id: `tep_dinh_kem_ai:${id}`, mo_ta: "Bỏ tệp chưa gửi." } });
      return row.khoa_luu_tru;
    });
    if (key) await removeAttachmentBytes(key);
    return { success: true as const };
  } catch (error) { return { success: false as const, message: error instanceof AttachmentError ? error.message : "Chưa bỏ được tệp. Hãy thử lại." }; }
}
export async function listPendingAiAttachments() {
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) throw Error();
    const rows = await db.tep_dinh_kem_ai.findMany({ where: { company_id: session.companyId, account_id: session.userId, tin_nhan_id: null }, orderBy: { id: "desc" }, take: AI_LIMITS.files.maxPending });
    return { success: true as const, files: rows.map(attachmentView) };
  } catch { return { success: false as const, message: "Chưa tải được các tệp đang soạn." }; }
}
