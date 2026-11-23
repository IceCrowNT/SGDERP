"use server";
import { z } from "zod";
import { attachmentView } from "@/lib/ai-attachment-storage";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { currentAccountActor } from "@/lib/rbac-server";
import { canUseAiChat } from "@/lib/ai-pilot";
import { assertChatSources, chatMessage } from "@/lib/ai-chat-server";
import { RenameChatSchema, chatTitle, ChatListCursorSchema, type ChatSummary } from "@/lib/ai-chat";

const denied = () => ({ success: false as const, message: "Không mở được hội thoại. Kiểm tra quyền hoặc mở chat mới nếu nguồn dữ liệu cũ không còn hợp lệ." });
export async function listAiChats(input: unknown = {}) {
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) return denied();
    const v = z.object({ archived: z.boolean().default(false), cursor: ChatListCursorSchema.optional() }).strict().safeParse(input);
    if (!v.success) return denied();
    return await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session);
      if (!canUseAiChat({ ...session, permissions: current.permissions })) return denied();
      const rows = await tx.hoi_thoai_ai.findMany({ where: { company_id: session.companyId, account_id: session.userId,
        trang_thai: v.data.archived ? "LUU_TRU" : "DANG_MO", ...(v.data.cursor ? { OR: [
          { updated_at: { lt: new Date(v.data.cursor.updatedAt) } },
          { updated_at: new Date(v.data.cursor.updatedAt), id: { lt: v.data.cursor.id } },
        ] } : {}) },
        orderBy: [{ updated_at: "desc" }, { id: "desc" }], take: 21,
        select: { id: true, tieu_de: true, trang_thai: true, updated_at: true,
          danh_sach_tin_nhan: { where: { vai_tro: "NGUOI_DUNG" }, orderBy: { id: "asc" }, take: 1, select: { noi_dung: true } } } });
      const page = rows.slice(0, 20);
      const sources = await tx.tin_nhan_ai.findMany({ where: { company_id: session.companyId, hoi_thoai_id: { in: page.map(row => row.id) } },
        select: { hoi_thoai_id: true, vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
      // Titles can contain business data. Check all sources before returning any text derived from a chat.
      let allValid = true;
      try { await assertChatSources(tx, { ...session, permissions: current.permissions }, sources); } catch { allValid = false; }
      const chats: ChatSummary[] = [];
      for (const row of page) {
        let valid = allValid;
        if (!allValid) { try { await assertChatSources(tx, { ...session, permissions: current.permissions }, sources.filter(source => source.hoi_thoai_id === row.id)); valid = true; } catch { /* Keep a neutral label for inaccessible sources. */ } }
        chats.push({ id: row.id, title: valid ? chatTitle(row.tieu_de === "Cuộc trò chuyện" ? row.danh_sach_tin_nhan[0]?.noi_dung : row.tieu_de) : "Cuộc trò chuyện không khả dụng",
          archived: row.trang_thai === "LUU_TRU", updatedAt: row.updated_at.toISOString() });
      }
      return { success: true as const, chats, nextCursor: rows.length > 20 ? { id: rows[19].id, updatedAt: rows[19].updated_at.toISOString() } : null };
    }, { timeout: 15000 });
  } catch { return denied(); }
}
export async function getAiChat(input: unknown) {
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) return denied();
    const v = z.object({ id: z.number().int().positive(), beforeId: z.number().int().positive().optional() }).strict().safeParse(input);
    if (!v.success) return denied();
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session); if (!canUseAiChat({ ...session, permissions: current.permissions })) throw Error();
      const chat = await tx.hoi_thoai_ai.findFirst({ where: { id: v.data.id, company_id: session.companyId, account_id: session.userId } });
      if (!chat) throw Error();
      await tx.tin_nhan_ai.updateMany({ where: { hoi_thoai_id: chat.id, trang_thai: "DANG_XU_LY", het_han_xu_ly: { lte: new Date() } },
        data: { trang_thai: "GIAN_DOAN", noi_dung: "Lượt xử lý đã gián đoạn. Bạn có thể gửi lại yêu cầu; có thể phát sinh thêm phí API.", ma_xu_ly: null, het_han_xu_ly: null } });
      const sources = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id }, select: { vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
      await assertChatSources(tx, { ...session, permissions: current.permissions }, sources);
      const rows = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: chat.id, ...(v.data.beforeId ? { id: { lt: v.data.beforeId } } : {}) }, orderBy: { id: "desc" }, take: 41 });
      const files = await tx.tep_dinh_kem_ai.findMany({ where: { company_id: session.companyId, account_id: session.userId, hoi_thoai_id: chat.id }, orderBy: { id: "asc" } });
      const running = await tx.tin_nhan_ai.count({ where: { hoi_thoai_id: chat.id, trang_thai: "DANG_XU_LY" } });
      const first = chat.tieu_de === "Cuộc trò chuyện" ? await tx.tin_nhan_ai.findFirst({ where: { hoi_thoai_id: chat.id, vai_tro: "NGUOI_DUNG" }, orderBy: { id: "asc" }, select: { noi_dung: true } }) : null;
      return { chat: { id: chat.id, title: chatTitle(chat.tieu_de === "Cuộc trò chuyện" ? first?.noi_dung : chat.tieu_de), archived: chat.trang_thai === "LUU_TRU", updatedAt: chat.updated_at.toISOString() },
        attachments: files.map(attachmentView),
        messages: rows.slice(0, 40).reverse().map(row => ({ ...chatMessage(row), attachments: files.filter(f => f.tin_nhan_id === row.id).map(attachmentView) })), nextCursor: rows.length > 40 ? rows[39].id : null, running: running > 0 };
    });
    return { success: true as const, ...result };
  } catch { return denied(); }
}
export async function archiveAiChat(input: unknown) {
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) return denied();
    const v = z.object({ id: z.number().int().positive(), archived: z.boolean() }).strict().safeParse(input); if (!v.success) return denied();
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session); if (!canUseAiChat({ ...session, permissions: current.permissions })) throw Error();
      const row = await tx.hoi_thoai_ai.findFirst({ where: { id: v.data.id, company_id: session.companyId, account_id: session.userId } }); if (!row) throw Error();
      if (await tx.tin_nhan_ai.count({ where: { hoi_thoai_id: row.id, trang_thai: "DANG_XU_LY", het_han_xu_ly: { gt: new Date() } } })) throw Error();
      await tx.hoi_thoai_ai.update({ where: { id: row.id }, data: { trang_thai: v.data.archived ? "LUU_TRU" : "DANG_MO" } });
      await tx.nhat_ky_hoat_dong.create({ data: { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
        phan_he: "AI", hanh_dong: v.data.archived ? "AI_CHAT_ARCHIVE" : "AI_CHAT_REOPEN", doi_tuong_id: `hoi_thoai_ai:${row.id}`, mo_ta: "Đổi trạng thái lưu trữ hội thoại riêng." } });
    });
    return { success: true as const };
  } catch { return denied(); }
}

export async function renameAiChat(input: unknown) {
  const v = RenameChatSchema.safeParse(input);
  if (!v.success) return { success: false as const, message: "Kiểm tra tên cuộc trò chuyện.", fieldErrors: v.error.flatten().fieldErrors };
  try {
    const session = await getSession(); if (!session || !canUseAiChat(session)) return denied();
    return await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const current = await currentAccountActor(tx, session);
      if (!canUseAiChat({ ...session, permissions: current.permissions })) return denied();
      const row = await tx.hoi_thoai_ai.findFirst({ where: { id: v.data.id, company_id: session.companyId, account_id: session.userId } });
      if (!row) return denied();
      const messages = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: row.id }, select: { vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
      await assertChatSources(tx, { ...session, permissions: current.permissions }, messages);
      const first = row.tieu_de === "Cuộc trò chuyện" ? await tx.tin_nhan_ai.findFirst({ where: { hoi_thoai_id: row.id, vai_tro: "NGUOI_DUNG" }, orderBy: { id: "asc" }, select: { noi_dung: true } }) : null;
      const previousTitle = chatTitle(row.tieu_de === "Cuộc trò chuyện" ? first?.noi_dung : row.tieu_de);
      if (previousTitle !== v.data.expectedTitle) return { success: false as const, message: "Tên hội thoại đã thay đổi. Đóng hộp thoại và tải lại danh sách trước khi đổi tên." };
      const title = chatTitle(v.data.title);
      // Renaming is not a new exchange: retain the conversation's activity order.
      await tx.hoi_thoai_ai.update({ where: { id: row.id }, data: { tieu_de: title, updated_at: row.updated_at } });
      await tx.nhat_ky_hoat_dong.create({ data: { company_id: session.companyId, account_id: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName, phan_he: "AI", hanh_dong: "AI_CHAT_RENAME", doi_tuong_id: `hoi_thoai_ai:${row.id}`, mo_ta: "Đổi tên hội thoại riêng." } });
      return { success: true as const, title };
    });
  } catch { return denied(); }
}
