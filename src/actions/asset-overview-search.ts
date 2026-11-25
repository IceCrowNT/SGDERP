"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeSearchText } from "@/lib/search-text";

export async function searchAssetOverview(input: unknown) {
  const session = await getSession();
  if (!session || (!hasPermission(session, "ASSETS") && !hasPermission(session, "INVENTORY"))) {
    return { success: false as const, message: "Bạn chưa được cấp quyền xem tài sản hoặc vật tư." };
  }
  const parsed = z.string().trim().max(120).safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Từ khóa tối đa 120 ký tự." };
  const query = normalizeSearchText(parsed.data);
  if (!query) return { success: true as const, rows: [], hasMore: false };

  // Each branch is authorized independently; never fetch unauthorized modules.
  const sources: Prisma.Sql[] = [];
  if (hasPermission(session, "ASSETS")) sources.push(Prisma.sql`
    SELECT a.id, a.ten_tai_san AS name, a.ma_tai_san AS code, 'asset'::text AS kind,
      l.ten_loai AS category,
      concat_ws(' ',a.ma_tai_san,a.ten_tai_san,a.so_serial,a.hang_model,l.ten_loai) AS text
    FROM tai_san.tai_san a JOIN tai_san.loai_tai_san l ON l.id=a.loai_tai_san_id AND l.company_id=a.company_id
    WHERE a.company_id=${session.companyId}`);
  if (hasPermission(session, "INVENTORY")) sources.push(Prisma.sql`
    SELECT m.id, m.ten_mat_hang AS name, m.ma_mat_hang AS code,
      CASE WHEN l.hang_muc='TIEU_HAO' THEN 'consumable' ELSE 'accessory' END AS kind,
      l.ten_loai AS category, concat_ws(' ',m.ma_mat_hang,m.ten_mat_hang,l.ten_loai) AS text
    FROM vat_tu.mat_hang_vat_tu m JOIN vat_tu.loai_vat_tu l ON l.id=m.loai_vat_tu_id AND l.company_id=m.company_id
    WHERE m.company_id=${session.companyId} AND m.dang_su_dung`);
  try {
    const rows = await db.$queryRaw<{ id: number; name: string; code: string; kind: "asset" | "consumable" | "accessory"; category: string }[]>(Prisma.sql`
      WITH candidates AS (${Prisma.join(sources, " UNION ALL ")}), normalized AS (
        SELECT *, regexp_replace(normalize(lower(replace(replace(text,'đ','d'),'Đ','D')),NFD), U&'[\\0300-\\036f]', '', 'g') AS search_text
        FROM candidates
      )
      SELECT id,name,code,kind,category FROM normalized
      WHERE ${Prisma.join(query.split(/\s+/).map(word => Prisma.sql`strpos(search_text,${word})>0`), " AND ")}
      ORDER BY CASE WHEN lower(code)=${query} THEN 0 WHEN starts_with(lower(code),${query}) THEN 1 ELSE 2 END, name,kind,id
      LIMIT 9`);
    return { success: true as const, hasMore: rows.length > 8, rows: rows.slice(0, 8).map(row => ({
      ...row, href: row.kind === "asset" ? `/assets?asset=${row.id}` : `/inventory?kind=${row.kind}&item=${row.id}`,
    })) };
  } catch {
    return { success: false as const, message: "Chưa tìm được dữ liệu. Vui lòng thử lại." };
  }
}
