"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { canUseAiPilot } from "@/lib/ai-pilot";
import { assertChatSources, chatMessage } from "@/lib/ai-chat-server";
import type { ChatSummary } from "@/lib/ai-chat";

const denied = () => ({ success: false as const, message: "Không mở được hội thoại. Kiểm tra quyền hoặc mở chat mới nếu nguồn dữ liệu cũ không còn hợp lệ." });
export async function listAiChats(input: unknown = {}) {
  try {
    const session = await getSession(); if (!session || !canUseAiPilot(session)) return denied();
    const v = z.object({ archived: z.boolean().default(false), beforeId: z.number().int().positive().optional() }).strict().safeParse(input);
    if (!v.success) return denied();
    const rows = await db.hoi_thoai_ai.findMany({ where: { company_id: session.companyId, account_id: session.userId,
      trang_thai: v.data.archived ? "LUU_TRU" : "DANG_MO", ...(v.data.beforeId ? { id: { lt: v.data.beforeId } } : {}) }, orderBy: { id: "desc" }, take: 21 });
    const chats: ChatSummary[] = rows.slice(0, 20).map(r => ({ id: r.id, title: "Cuộc trò chuyện", archived: r.trang_thai === "LUU_TRU", updatedAt: r.updated_at.toISOString() }));
    return { success: true as const, chats, nextCursor: rows.length > 20 ? rows[19].id : null };
  } catch { return denied(); }
}
export async function getAiChat(input: unknown) {
  try {
    const session = await getSession(); if (!session || !canUseAiPilot(session)) return denied();
    const v = z.object({ id: z.number().int().positive(), beforeId: z.number().int().positive().optional() }).strict().safeParse(input);
    if (!v.success) return denied();
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentActor(tx, session, "ROLES"); if (!canUseAiPilot({ ...session, permissions: current.permissions })) throw Error();
      const chat = await tx.hoi_thoai_ai.findFirst({ where: { id: v.data.id, company_id: session.companyId, account_id: session.userId } });
      if (!chat) throw Error();
      await tx.tin_nhan_ai.updateMany({ where: { hoi_thoai_id: chat.id, trang_thai: "DANG_XU_LY", het_han_xu_ly: { lte: new Date() } },
        data: { trang_thai: "GIAN_DOAN", noi_dung: "Lượt xử lý đã gián đoạn. Bạn có thể gửi lại yêu cầu; có thể phát sinh thêm phí API.", ma_xu_ly: null, het_han_xu_ly: null } });
      const sources = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id }, select: { vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
      await assertChatSources(tx, session, sources);
      const rows = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id, ...(v.data.beforeId ? { id: { lt: v.data.beforeId } } : {}) }, orderBy: { id: "desc" }, take: 41 });
      const running = await tx.tin_nhan_ai.count({ where: { hoi_thoai_id: chat.id, trang_thai: "DANG_XU_LY" } });
      return { chat: { id: chat.id, title: "Cuộc trò chuyện", archived: chat.trang_thai === "LUU_TRU", updatedAt: chat.updated_at.toISOString() },
        messages: rows.slice(0, 40).reverse().map(chatMessage), nextCursor: rows.length > 40 ? rows[39].id : null, running: running > 0 };
    });
    return { success: true as const, ...result };
  } catch { return denied(); }
}
export async function archiveAiChat(input: unknown) {
  try {
    const session = await getSession(); if (!session || !canUseAiPilot(session)) return denied();
    const v = z.object({ id: z.number().int().positive(), archived: z.boolean() }).strict().safeParse(input); if (!v.success) return denied();
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentActor(tx, session, "ROLES"); if (!canUseAiPilot({ ...session, permissions: current.permissions })) throw Error();
      const row = await tx.hoi_thoai_ai.findFirst({ where: { id: v.data.id, company_id: session.companyId, account_id: session.userId } }); if (!row) throw Error();
      if (await tx.tin_nhan_ai.count({ where: { hoi_thoai_id: row.id, trang_thai: "DANG_XU_LY", het_han_xu_ly: { gt: new Date() } } })) throw Error();
      await tx.hoi_thoai_ai.update({ where: { id: row.id }, data: { trang_thai: v.data.archived ? "LUU_TRU" : "DANG_MO" } });
      await tx.nhat_ky_hoat_dong.create({ data: { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
        phan_he: "AI", hanh_dong: v.data.archived ? "AI_CHAT_ARCHIVE" : "AI_CHAT_REOPEN", doi_tuong_id: `hoi_thoai_ai:${row.id}`, mo_ta: "Đổi trạng thái lưu trữ hội thoại riêng." } });
    });
    return { success: true as const };
  } catch { return denied(); }
}
