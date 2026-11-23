import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUseAiChat } from "@/lib/ai-pilot";
import { assertChatSources } from "@/lib/ai-chat-server";
import { readAttachmentBytes } from "@/lib/ai-attachment-storage";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(), raw = (await params).id;
    if (!session || !canUseAiChat(session) || !/^\d+$/.test(raw)) throw Error();
    const row = await db.tep_dinh_kem_ai.findFirst({ where: { id: Number(raw), company_id: session.companyId, account_id: session.userId } });
    if (!row) throw Error();
    if (row.hoi_thoai_id) await db.$transaction(async tx => {
      const sources = await tx.tin_nhan_ai.findMany({ where: { hoi_thoai_id: row.hoi_thoai_id! }, select: { vai_tro: true, trang_thai: true, du_lieu_kem_theo: true } });
      await assertChatSources(tx, session, sources);
    });
    const preview = new URL(request.url).searchParams.get("preview") === "1";
    if (preview && row.loai_tep !== "image") throw Error();
    const bytes = await readAttachmentBytes(row.khoa_luu_tru, preview);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": preview ? "image/jpeg" : "application/octet-stream", "Content-Disposition": preview ? "inline" : `attachment; filename*=UTF-8''${encodeURIComponent(row.ten_tep).replace(/'/g, "%27")}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return new Response("Không tìm thấy tệp hoặc không có quyền.", { status: 404, headers: { "Cache-Control": "no-store" } }); }
}
