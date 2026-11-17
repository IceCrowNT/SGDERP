import type { Prisma, tin_nhan_ai } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { ChatMetadataSchema, type ChatMetadata, type ChatMessage } from "@/lib/ai-chat";

// Integrity checks shared by read/send actions; mutations stay in Server Actions.
export async function assertChatSources(tx: Prisma.TransactionClient, session: SessionUser, rows: Pick<tin_nhan_ai, "vai_tro" | "trang_thai" | "du_lieu_kem_theo">[]) {
  const ids = { assets: new Set<number>(), locations: new Set<number>(), categories: new Set<number>(), departments: new Set<number>(), people: new Set<number>() };
  const works = new Set<number>();
  for (const row of rows) {
    if (row.vai_tro !== "TRO_LY" || row.trang_thai !== "HOAN_TAT") continue;
    const metadata = ChatMetadataSchema.parse(row.du_lieu_kem_theo);
    for (const trace of metadata.ngu_canh) for (const ref of trace.references) for (const id of ref.ids) ids[ref.kind].add(id);
    if (metadata.workId) works.add(metadata.workId);
  }
  const where = (values: Set<number>) => ({ company_id: session.companyId, id: { in: [...values] } });
  const counts = await Promise.all([
    tx.tai_san.count({ where: where(ids.assets) }), tx.vi_tri.count({ where: where(ids.locations) }),
    tx.loai_tai_san.count({ where: where(ids.categories) }), tx.phong_ban.count({ where: where(ids.departments) }),
    tx.nhan_su.count({ where: where(ids.people) }), tx.cong_viec_ai.count({ where: { ...where(works), account_id: session.userId } }),
  ]);
  const expected = [...Object.values(ids).map(s => s.size), works.size];
  if (counts.some((n, i) => n !== expected[i])) throw Error("Nguồn hội thoại không còn hợp lệ.");
}
export function chatMessage(row: tin_nhan_ai): ChatMessage {
  const metadata = row.vai_tro === "TRO_LY" && row.trang_thai === "HOAN_TAT" ? ChatMetadataSchema.parse(row.du_lieu_kem_theo) : null;
  return { id: row.id, role: row.vai_tro === "NGUOI_DUNG" ? "user" : "assistant", content: row.noi_dung,
    status: row.trang_thai, requestId: row.ma_yeu_cau, createdAt: row.created_at.toISOString(),
    ...(metadata ? { resultLists: metadata.ngu_canh.filter(trace => trace.results?.length).map(trace => ({ label: trace.tool === "search_assets" ? "Tài sản đã tra cứu" : "Danh mục đã tra cứu", items: trace.results!.map(row => row.label) })) } : {}),
    ...(metadata?.workId ? { workId: metadata.workId } : {}), ...(metadata?.draft ? { draft: true } : {}), ...(metadata?.contextTruncated ? { contextTruncated: true } : {}) };
}
export function chatContext(rows: tin_nhan_ai[]) {
  const selected: { role: "user" | "assistant"; content: string }[][] = [];
  let length = 0, bytes = 0, truncated = false;
  const answers = rows.filter(r => r.vai_tro === "TRO_LY");
  for (const answer of [...answers].reverse()) {
    const question = rows.find(r => r.vai_tro === "NGUOI_DUNG" && r.ma_yeu_cau === answer.ma_yeu_cau);
    if (!question) continue;
    if (answer.trang_thai !== "HOAN_TAT") {
      // Failed changes of scope remain explicit, never silently revert to an older result.
      const pair = [{ role: "user" as const, content: question.noi_dung }, { role: "assistant" as const, content: "Lượt này chưa có kết quả; cần làm rõ yêu cầu trước khi dùng lại đối tượng cũ." }];
      const size = pair.reduce((n, m) => n + m.content.length, 0);
      if (selected.length >= 12 || length + size > 24000 || bytes + Buffer.byteLength(JSON.stringify(pair), "utf8") > 32000) { truncated = true; break; }
      selected.unshift(pair); length += size; bytes += Buffer.byteLength(JSON.stringify(pair), "utf8"); continue;
    }
    const metadata: ChatMetadata = ChatMetadataSchema.parse(answer.du_lieu_kem_theo);
    const context = JSON.stringify({ ngu_canh: metadata.ngu_canh, workId: metadata.workId ?? null, draft: metadata.draft ?? false });
    const content = answer.noi_dung + (metadata.ngu_canh.length || metadata.workId ? `\nDữ liệu tham chiếu đã tra ở lượt này (không phải thông tin hiện tại): ${context}` : "");
    const size = question.noi_dung.length + content.length;
    if (selected.length >= 12 || length + size > 24000 || bytes + Buffer.byteLength(question.noi_dung + content, "utf8") > 32000) { truncated = true; break; }
    selected.unshift([{ role: "user", content: question.noi_dung }, { role: "assistant", content }]); length += size; bytes += Buffer.byteLength(question.noi_dung + content, "utf8");
  }
  return { messages: selected.flat(), truncated };
}
