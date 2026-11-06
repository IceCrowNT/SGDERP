import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { avatarDirectory, avatarFilename } from "@/lib/profile-storage";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = await getSession({ allowPasswordChange: true });
  if (!session) return new Response(null, { status: 401 });
  const { file } = await params;
  const url = `/media/avatar/${file}`;
  if (!avatarFilename(url)) return new Response(null, { status: 404 });
  const person = await db.nhan_su.findFirst({
    where: {
      company_id: session.companyId,
      duong_dan_anh_dai_dien: url,
      ...(!session.mustChangePassword && hasPermission(session, "HR")
        ? {}
        : { id: session.employeeId ?? -1 }),
    },
    select: { id: true },
  });
  if (!person) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(avatarDirectory, file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
