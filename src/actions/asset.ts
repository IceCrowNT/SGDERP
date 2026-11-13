"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasPermission, type SessionUser } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { SaveAssetCategorySchema, SaveAssetSchema, AssetQuerySchema, AssignAssetLocationSchema, AssetLocationQuerySchema } from "@/lib/validations/asset";
import { locationPath } from "@/lib/location-tree";
import { isAvailableAssetLocation } from "@/lib/asset-location";

class AssetError extends Error {}
const denied = () => ({ success: false as const, message: "Bạn chưa được cấp quyền tài sản phù hợp." });
const assetId = z.number().int().positive();
const categorySelection = { id: true, ma_loai: true, ten_loai: true, mo_ta: true, dang_su_dung: true, updated_at: true } as const;
const assetSelection = {
  id: true, ma_tai_san: true, ten_tai_san: true, loai_tai_san_id: true,
  phong_quan_ly_id: true, nguoi_su_dung_id: true, vi_tri_id: true,
  tinh_trang: true, hinh_thuc_su_dung: true, so_serial: true, hang_model: true,
  ghi_chu: true, created_at: true, updated_at: true,
  loai_tai_san: { select: { id: true, ma_loai: true, ten_loai: true, dang_su_dung: true } },
  phong_quan_ly: { select: { id: true, ma_phong_ban: true, ten_phong_ban: true } },
  nguoi_su_dung: { select: { id: true, ma_nhan_su: true, ho_ten: true, tinh_trang_lam_viec: true } },
  vi_tri: { select: { id: true, ma_vi_tri: true, ten_vi_tri: true } },
} as const;
function failure(error: unknown) {
  return { success: false as const, message: error instanceof AssetError ? error.message
    : error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "Mã đã được sử dụng. Hãy kiểm tra lại."
    : "Không thể lưu tài sản. Hãy tải lại trang và kiểm tra quyền truy cập." };
}
async function lock(tx: Prisma.TransactionClient, session: SessionUser) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  await currentActor(tx, session, "ASSETS");
}
function assertVersion(before: { updated_at: Date } | null, id?: number, version?: string) {
  if (id && !before) throw new AssetError("Không tìm thấy hồ sơ trong công ty.");
  if (before && before.updated_at.toISOString() !== version)
    throw new AssetError("Hồ sơ đã thay đổi. Tải lại trước khi lưu.");
}
async function audit(tx: Prisma.TransactionClient, session: SessionUser, kind: "tai_san" | "loai_tai_san", id: number, name: string, before: unknown, after: unknown) {
  await tx.nhat_ky_hoat_dong.create({ data: {
    company_id: session.companyId, account_id: session.userId,
    ten_dang_nhap: session.username, ho_ten: session.fullName,
    phan_he: "ASSETS", doi_tuong_id: `${kind}:${id}`, ten_doi_tuong: name,
    hanh_dong: before ? "UPDATE" : "CREATE",
    mo_ta: `${before ? "Cập nhật" : "Tạo"} ${kind === "tai_san" ? "tài sản" : "loại tài sản"}: ${name}`,
    du_lieu_cu: before ? JSON.parse(JSON.stringify(before)) : Prisma.DbNull,
    du_lieu_moi: JSON.parse(JSON.stringify(after)),
  } });
}

export async function getAssetCategories() {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS") || !session) return denied();
  const rows = await db.loai_tai_san.findMany({ where: { company_id: session.companyId }, select: categorySelection, orderBy: { ten_loai: "asc" } });
  return { success: true as const, rows, canManage: hasPermission(session, "ASSETS", "MANAGE") };
}

export async function getAssets(input: unknown = {}) {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS") || !session) return denied();
  const parsed = AssetQuerySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Bộ lọc không hợp lệ." };
  const v = parsed.data;
  const where: Prisma.tai_sanWhereInput = {
    company_id: session.companyId,
    loai_tai_san_id: v.categoryId, tinh_trang: v.condition, hinh_thuc_su_dung: v.usage,
    phong_quan_ly_id: v.departmentId, nguoi_su_dung_id: v.employeeId, vi_tri_id: v.locationId,
    ...(v.search ? { OR: [
      { ten_tai_san: { contains: v.search, mode: "insensitive" } },
      { ma_tai_san: { contains: v.search, mode: "insensitive" } },
      { so_serial: { contains: v.search, mode: "insensitive" } },
      { hang_model: { contains: v.search, mode: "insensitive" } },
    ] } : {}),
  };
  try {
    const result = await db.$transaction(async tx => {
      const total = await tx.tai_san.count({ where });
      const pageSize = 20, pages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(v.page, pages);
      const [rows, retired, personal, byCategory] = await Promise.all([
        tx.tai_san.findMany({ where, select: assetSelection, orderBy: [{ updated_at: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        tx.tai_san.count({ where: { AND: [where, { tinh_trang: "NGUNG_SU_DUNG" }] } }),
        tx.tai_san.count({ where: { AND: [where, { hinh_thuc_su_dung: "CA_NHAN" }] } }),
        tx.tai_san.groupBy({ by: ["loai_tai_san_id"], where, _count: { _all: true } }),
      ]);
      return { rows, total, remaining: total - retired, personal, byCategory: byCategory.map(r => ({ id: r.loai_tai_san_id, count: r._count._all })), page, pages, pageSize };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { success: true as const, ...result, canManage: hasPermission(session, "ASSETS", "MANAGE") };
  } catch { return { success: false as const, message: "Không tải được danh sách tài sản. Vui lòng thử lại." }; }
}

/** Group summaries only; device dossiers are loaded when a group/search is opened. */
export async function getAssetOverview() {
  const session = await getSession();
  if (!session || !hasPermission(session, "ASSETS")) return denied();
  try {
    const summary = await db.$transaction(async tx => {
      const where = { company_id: session.companyId };
      const [categories, people, locations, categoryCounts, peopleCounts, locationCounts] = await Promise.all([
        tx.loai_tai_san.findMany({ where, select: { id: true, ma_loai: true, ten_loai: true, dang_su_dung: true }, orderBy: { ten_loai: "asc" } }),
        tx.nhan_su.findMany({ where: { ...where, danh_sach_tai_san: { some: where } }, select: { id: true, ho_ten: true, ma_nhan_su: true }, orderBy: { ho_ten: "asc" } }),
        tx.vi_tri.findMany({ where, select: { id: true, parent_id: true, ten_vi_tri: true } }),
        tx.tai_san.groupBy({ by: ["loai_tai_san_id"], where, _count: { _all: true } }),
        tx.tai_san.groupBy({ by: ["nguoi_su_dung_id", "hinh_thuc_su_dung"], where, _count: { _all: true } }),
        tx.tai_san.groupBy({ by: ["vi_tri_id"], where, _count: { _all: true } }),
      ]);
      const byCategory = categories.map(c => ({ id: `category:${c.id}`, label: c.ten_loai, description: c.dang_su_dung ? "" : "Ngừng dùng", icon: c.ma_loai, count: categoryCounts.find(r => r.loai_tai_san_id === c.id)?._count._all ?? 0, query: { categoryId: c.id } }));
      const byEmployee = people.map(p => ({ id: `employee:${p.id}`, label: p.ho_ten, description: p.ma_nhan_su, icon: "", count: peopleCounts.filter(r => r.nguoi_su_dung_id === p.id).reduce((sum, r) => sum + r._count._all, 0), query: { employeeId: p.id } }));
      const unassigned = peopleCounts.filter(r => r.nguoi_su_dung_id === null).map(r => ({ id: `usage:${r.hinh_thuc_su_dung}`, label: r.hinh_thuc_su_dung === "DUNG_CHUNG" ? "Dùng chung" : r.hinh_thuc_su_dung === "CHUA_PHAN_BO" ? "Chưa phân bổ" : "Chưa rõ người sử dụng", description: "", icon: "", count: r._count._all, query: { usage: r.hinh_thuc_su_dung } }));
      const byLocation = locationCounts.map(r => ({ id: `location:${r.vi_tri_id ?? "none"}`, label: r.vi_tri_id ? locations.find(l => l.id === r.vi_tri_id)?.ten_vi_tri ?? "Vị trí" : "Chưa rõ vị trí", description: r.vi_tri_id ? locationPath(r.vi_tri_id, locations) : "", icon: "", count: r._count._all, query: { locationId: r.vi_tri_id } })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
      return { total: categoryCounts.reduce((sum, r) => sum + r._count._all, 0), byCategory, byEmployee: [...byEmployee, ...unassigned], byLocation };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { success: true as const, ...summary, canManage: hasPermission(session, "ASSETS", "MANAGE") };
  } catch { return { success: false as const, message: "Không tải được nhóm tài sản. Hãy thử lại." }; }
}

// VIEW filters expose only names attached to assets in this company, not full HR catalogs.
export async function getAssetFilterOptions() {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS") || !session) return denied();
  const [employees, departments, locations, tree] = await Promise.all([
    db.nhan_su.findMany({ where: { company_id: session.companyId, danh_sach_tai_san: { some: { company_id: session.companyId } } }, select: { id: true, ho_ten: true, ma_nhan_su: true }, orderBy: { ho_ten: "asc" } }),
    db.phong_ban.findMany({ where: { company_id: session.companyId, danh_sach_tai_san: { some: { company_id: session.companyId } } }, select: { id: true, ten_phong_ban: true }, orderBy: { ten_phong_ban: "asc" } }),
    db.vi_tri.findMany({ where: { company_id: session.companyId, danh_sach_tai_san: { some: { company_id: session.companyId } } }, select: { id: true }, orderBy: { ten_vi_tri: "asc" } }),
    db.vi_tri.findMany({ where: { company_id: session.companyId }, select: { id: true, parent_id: true, ten_vi_tri: true } }),
  ]);
  return { success: true as const, employees, departments, locations: locations.map(row => ({ id: row.id, name: locationPath(row.id, tree) })) };
}

export async function getAsset(id: number) {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS") || !session) return denied();
  if (!assetId.safeParse(id).success) return { success: false as const, message: "Tài sản không hợp lệ." };
  const row = await db.tai_san.findFirst({ where: { id, company_id: session.companyId }, select: assetSelection });
  if (!row) return { success: false as const, message: "Không tìm thấy tài sản." };
  return { success: true as const, row, canManage: hasPermission(session, "ASSETS", "MANAGE") };
}

export async function getAssetHistory(id: number) {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS") || !session) return denied();
  if (!assetId.safeParse(id).success || !await db.tai_san.count({ where: { id, company_id: session.companyId } }))
    return { success: false as const, message: "Không tìm thấy tài sản." };
  const rows = await db.nhat_ky_hoat_dong.findMany({
    where: { company_id: session.companyId, phan_he: "ASSETS", doi_tuong_id: `tai_san:${id}` },
    select: { id: true, hanh_dong: true, ho_ten: true, mo_ta: true, created_at: true, du_lieu_cu: true, du_lieu_moi: true },
    orderBy: [{ created_at: "desc" }, { id: "desc" }], take: 50,
  });
  return { success: true as const, rows };
}

export async function getAssetAssignmentOptions() {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS", "MANAGE") || !session) return denied();
  const [employees, departments] = await Promise.all([
    db.nhan_su.findMany({ where: { company_id: session.companyId, tinh_trang_lam_viec: "ACTIVE" }, select: { id: true, ma_nhan_su: true, ho_ten: true, tinh_trang_lam_viec: true }, orderBy: { ho_ten: "asc" } }),
    db.phong_ban.findMany({ where: { company_id: session.companyId }, select: { id: true, ma_phong_ban: true, ten_phong_ban: true }, orderBy: { ten_phong_ban: "asc" } }),
  ]);
  return { success: true as const, employees, departments };
}

export async function saveAssetCategory(input: unknown) {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS", "MANAGE") || !session) return denied();
  const parsed = SaveAssetCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  try {
    const id = await db.$transaction(async tx => {
      await lock(tx, session);
      const before = v.id ? await tx.loai_tai_san.findFirst({ where: { id: v.id, company_id: session.companyId }, select: categorySelection }) : null;
      assertVersion(before, v.id, v.version);
      if (before && before.ma_loai !== v.code) throw new AssetError("Mã loại không thể thay đổi.");
      const data = { ten_loai: v.name, mo_ta: v.description, dang_su_dung: v.active, updated_at: new Date(Math.max(Date.now(), (before?.updated_at.getTime() ?? 0) + 1)) };
      const after = before ? await tx.loai_tai_san.update({ where: { id: before.id }, data, select: categorySelection })
        : await tx.loai_tai_san.create({ data: { ...data, company_id: session.companyId, ma_loai: v.code }, select: categorySelection });
      await audit(tx, session, "loai_tai_san", after.id, after.ten_loai, before, after);
      return after.id;
    });
    revalidatePath("/assets");
    return { success: true as const, id, message: "Đã lưu loại tài sản." };
  } catch (error) { return failure(error); }
}

export async function saveAsset(input: unknown) {
  const session = await getSession();
  if (!hasPermission(session, "ASSETS", "MANAGE") || !session) return denied();
  const parsed = SaveAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Kiểm tra các trường được đánh dấu.", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  try {
    const id = await db.$transaction(async tx => {
      await lock(tx, session);
      const before = v.id ? await tx.tai_san.findFirst({ where: { id: v.id, company_id: session.companyId }, select: assetSelection }) : null;
      assertVersion(before, v.id, v.version);
      if (before?.loai_tai_san_id !== v.categoryId && !await tx.loai_tai_san.count({ where: { id: v.categoryId, company_id: session.companyId, dang_su_dung: true } }))
        throw new AssetError("Chọn loại tài sản còn sử dụng trong công ty.");
      if (v.employeeId !== null && before?.nguoi_su_dung_id !== v.employeeId && !await tx.nhan_su.count({ where: { id: v.employeeId, company_id: session.companyId, tinh_trang_lam_viec: "ACTIVE" } }))
        throw new AssetError("Chỉ giao mới cho nhân sự đang làm việc trong công ty.");
      if (v.departmentId !== null && !await tx.phong_ban.count({ where: { id: v.departmentId, company_id: session.companyId } }))
        throw new AssetError("Phòng quản lý không hợp lệ.");
      if (v.locationId !== null && before?.vi_tri_id !== v.locationId) {
        let current: number | null = v.locationId;
        const seen = new Set<number>();
        while (current !== null) {
          if (seen.has(current)) throw new AssetError("Vị trí không hợp lệ.");
          seen.add(current);
          const row: { parent_id: number | null } | null = await tx.vi_tri.findFirst({ where: { id: current, company_id: session.companyId, dang_su_dung: true }, select: { parent_id: true } });
          if (!row) throw new AssetError("Vị trí hoặc cấp trên không còn sử dụng.");
          current = row.parent_id;
        }
      }
      const data = {
        ten_tai_san: v.name, loai_tai_san_id: v.categoryId, phong_quan_ly_id: v.departmentId,
        nguoi_su_dung_id: v.employeeId, vi_tri_id: v.locationId, tinh_trang: v.condition,
        hinh_thuc_su_dung: v.usage, so_serial: v.serial, hang_model: v.model, ghi_chu: v.notes,
        updated_at: new Date(Math.max(Date.now(), (before?.updated_at.getTime() ?? 0) + 1)),
      };
      const after = before ? await tx.tai_san.update({ where: { id: before.id }, data, select: assetSelection })
        : await tx.tai_san.create({ data: { ...data, company_id: session.companyId }, select: assetSelection });
      await audit(tx, session, "tai_san", after.id, after.ten_tai_san, before, after);
      return after.id;
    });
    for (const path of ["/assets", "/locations", "/departments", "/office-3d", "/office-3d/hcns"]) revalidatePath(path);
    return { success: true as const, id, message: "Đã lưu tài sản." };
  } catch (error) { return failure(error); }
}

// Small, paged selection list: no HR profile, serial, notes or ownership edits.
export async function getAssetLocationCandidates(input: unknown = {}) {
  const session = await getSession();
  if (!session || !hasPermission(session, "ASSETS", "MANAGE")) return denied();
  const parsed = AssetLocationQuerySchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Từ khóa hoặc trang không hợp lệ." };
  const { search, page } = parsed.data;
  const where: Prisma.tai_sanWhereInput = {
    company_id: session.companyId,
    ...(search ? { OR: [
      { ten_tai_san: { contains: search, mode: "insensitive" } },
      { ma_tai_san: { contains: search, mode: "insensitive" } },
      { so_serial: { contains: search, mode: "insensitive" } },
    ] } : {}),
  };
  try {
    const rows = await db.tai_san.findMany({ where, orderBy: [{ ma_tai_san: "asc" }, { id: "asc" }],
      take: 21, skip: (page - 1) * 20,
      select: { id: true, ma_tai_san: true, ten_tai_san: true, tinh_trang: true,
        vi_tri_id: true, updated_at: true,
        loai_tai_san: { select: { ma_loai: true, ten_loai: true } } },
    });
    const locations = await db.vi_tri.findMany({ where: { company_id: session.companyId },
      select: { id: true, parent_id: true, ten_vi_tri: true } });
    return { success: true as const, hasMore: rows.length > 20, rows: rows.slice(0, 20).map(row => ({
      id: row.id, code: row.ma_tai_san, name: row.ten_tai_san,
      category: row.loai_tai_san.ten_loai, categoryCode: row.loai_tai_san.ma_loai,
      condition: row.tinh_trang, locationId: row.vi_tri_id,
      locationName: row.vi_tri_id === null ? "Chưa xác định vị trí" : locationPath(row.vi_tri_id, locations),
      version: row.updated_at.toISOString(),
    })) };
  } catch { return { success: false as const, message: "Không tải được tài sản. Vui lòng thử lại." }; }
}

export async function assignAssetLocation(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "ASSETS", "MANAGE")) return denied();
  const parsed = AssignAssetLocationSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Chọn tài sản và vị trí hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  try {
    const result = await db.$transaction(async tx => {
      await lock(tx, session);
      const before = await tx.tai_san.findFirst({ where: { id: v.assetId, company_id: session.companyId }, select: assetSelection });
      if (!before) throw new AssetError("Không tìm thấy tài sản trong công ty.");
      if (before.updated_at.toISOString() !== v.version)
        return { success: false as const, code: "STALE" as const, message: "Tài sản đã thay đổi. Hãy tải lại và chọn lại để xác nhận vị trí mới nhất." };
      if (before.vi_tri_id === v.locationId) return { success: true as const, message: "Tài sản đã ở vị trí này." };
      if (before.vi_tri_id !== null && !v.confirmMove)
        return { success: false as const, code: "CONFIRM_MOVE" as const, message: "Tài sản đã có vị trí. Vui lòng xác nhận thay đổi." };
      const locations = await tx.vi_tri.findMany({ where: { company_id: session.companyId },
        select: { id: true, parent_id: true, ten_vi_tri: true, dang_su_dung: true } });
      if (v.locationId !== null && !isAvailableAssetLocation(v.locationId, locations))
        throw new AssetError("Vị trí hoặc cấp trên không còn sử dụng trong công ty.");
      const path = (id: number | null) => id === null ? "Chưa xác định vị trí" : locationPath(id, locations);
      const after = await tx.tai_san.update({ where: { id: before.id }, data: {
        vi_tri_id: v.locationId,
        updated_at: new Date(Math.max(Date.now(), before.updated_at.getTime() + 1)),
      }, select: assetSelection });
      await audit(tx, session, "tai_san", after.id, after.ten_tai_san,
        { ...before, duong_dan_vi_tri: path(before.vi_tri_id) },
        { ...after, duong_dan_vi_tri: path(after.vi_tri_id) });
      return { success: true as const, message: v.locationId === null ? "Đã bỏ gán vị trí tài sản." : "Đã cập nhật vị trí tài sản." };
    });
    if (result.success) for (const path of ["/assets", "/locations", "/office-3d", "/office-3d/hcns"]) revalidatePath(path);
    return result;
  } catch (error) { return failure(error); }
}
