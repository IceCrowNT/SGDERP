import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { taskActor, taskScope } from "@/lib/support-task-access";
import { readTaskBytes } from "@/lib/support-task-storage";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await getSession(),
    id = Number((await params).id);
  const fail = (status: number) =>
    new Response("Tệp không khả dụng.", {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!s || !Number.isSafeInteger(id) || id <= 0) return fail(404);
  try {
    const f = await db.$transaction(async (tx) => {
      const a = await taskActor(tx, s);
      return tx.tep_cong_viec.findFirst({
        where: { id, company_id: s.companyId, cong_viec: taskScope(a) },
      });
    });
    if (!f) return fail(404);
    const bytes = await readTaskBytes(f.khoa_luu_tru);
    if (
      BigInt(bytes.length) !== f.kich_thuoc_byte ||
      createHash("sha256").update(bytes).digest("hex") !== f.sha256
    )
      return fail(503);
    const inline =
      new URL(request.url).searchParams.get("view") === "1" &&
      ["image/png", "image/jpeg"].includes(f.mime_type);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": f.mime_type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="download"; filename*=UTF-8''${encodeURIComponent(f.ten_goc).replace(/'/g, "%27")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return fail(404);
  }
}
