"use server";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import { currentActor } from "@/lib/rbac-server";
import { locationPath } from "@/lib/location-tree";
import {
  SaveLocationSchema,
  DeleteLocationSchema,
} from "@/lib/validations/location";

class LocationError extends Error { }
function failure(error: unknown) {
  return {
    success: false as const,
    message:
      error instanceof LocationError
        ? error.message
        : error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
          ? "Vị trí còn dữ liệu liên kết. Hãy chuyển các dữ liệu này trước."
          : "Không thể lưu vị trí. Hãy tải lại trang và kiểm tra quyền truy cập.",
  };
}
const selection = {
  id: true,
  ma_vi_tri: true,
  ten_vi_tri: true,
  loai_vi_tri: true,
  parent_id: true,
  mo_ta: true,
  dang_su_dung: true,
  updated_at: true,
} as const;
export async function getLocations() {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS"))
    return {
      success: false as const,
      message: "Bạn chưa được cấp quyền xem vị trí & không gian.",
    };
  const rows = await db.vi_tri.findMany({
    where: { company_id: session.companyId },
    select: selection,
    orderBy: [{ ten_vi_tri: "asc" }, { id: "asc" }],
  });
  return {
    success: true as const,
    canManageEmployees: hasPermission(session, "HR", "MANAGE"),
    employees: hasPermission(session, "HR")
      ? (await db.nhan_su.findMany({
        where: { company_id: session.companyId },
        select: { id: true, ho_ten: true, tinh_trang_lam_viec: true, vi_tri_lam_viec_id: true, updated_at: true, phong_ban: { select: { ten_phong_ban: true } } },
        orderBy: [{ ho_ten: "asc" }, { id: "asc" }],
      })).map((person) => ({
        id: person.id, name: person.ho_ten, status: person.tinh_trang_lam_viec,
        department: person.phong_ban?.ten_phong_ban ?? null,
        locationId: person.vi_tri_lam_viec_id, version: person.updated_at.toISOString(),
      }))
      : null,
    canManage: hasPermission(session, "LOCATIONS", "MANAGE"),
    rows: rows.map(({ updated_at, ...row }) => ({
      ...row,
      version: updated_at.toISOString(),
    })),
  };
}
// Choosing a location does not grant access to the full location or HR modules.
export async function getLocationOptions() {
  const session = await getSession();
  if (
    !session ||
    !(
      hasPermission(session, "HR", "MANAGE") ||
      hasPermission(session, "ASSETS", "MANAGE") ||
      hasPermission(session, "LOCATIONS")
    )
  )
    return { success: false as const, message: "Không có quyền chọn vị trí." };
  const rows = await db.vi_tri.findMany({
    where: { company_id: session.companyId, dang_su_dung: true },
    select: {
      id: true,
      ma_vi_tri: true,
      ten_vi_tri: true,
      loai_vi_tri: true,
      parent_id: true,
      dang_su_dung: true,
    },
    orderBy: { ten_vi_tri: "asc" },
  });
  return { success: true as const, rows };
}
export async function getLocationHistory(id: number) {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS"))
    return {
      success: false as const,
      message: "Không có quyền xem lịch sử vị trí.",
    };
  if (!z.number().int().positive().safeParse(id).success)
    return { success: false as const, message: "Vị trí không hợp lệ." };
  // History is retained for deleted locations; tenant + namespace prevents cross-feature disclosure.
  const rows = await db.nhat_ky_hoat_dong.findMany({
    where: {
      company_id: session.companyId,
      phan_he: "LOCATIONS",
      doi_tuong_id: `vi_tri:${id}`,
    },
    select: {
      id: true,
      hanh_dong: true,
      mo_ta: true,
      ho_ten: true,
      created_at: true,
      du_lieu_cu: true,
      du_lieu_moi: true,
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: 50,
  });
  return {
    success: true as const,
    rows: rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() })),
  };
}
export async function saveLocation(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS", "MANAGE"))
    return {
      success: false as const,
      message: "Bạn không có quyền quản lý vị trí.",
    };
  const parsed = SaveLocationSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false as const,
      message: "Kiểm tra các trường được đánh dấu.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  try {
    const id = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      await currentActor(tx, session, "LOCATIONS");
      const before = v.id
        ? await tx.vi_tri.findFirst({
          where: { id: v.id, company_id: session.companyId },
          select: selection,
        })
        : null;
      if (v.id && !before) throw new LocationError("Vị trí không tồn tại.");
      if (before && before.updated_at.toISOString() !== v.version)
        throw new LocationError(
          "Vị trí đã thay đổi. Tải lại trang trước khi lưu.",
        );
      if (before && before.parent_id !== v.parentId && !v.confirmMove)
        throw new LocationError(
          "Xác nhận chuyển vị trí cha và đường dẫn của cả nhánh.",
        );
      const all = await tx.vi_tri.findMany({
        where: { company_id: session.companyId },
        select: {
          id: true,
          parent_id: true,
          ten_vi_tri: true,
          dang_su_dung: true,
        },
      });
      const map = new Map(all.map((r) => [r.id, r]));
      const seen = new Set<number>();
      let parent = v.parentId;
      while (parent !== null) {
        if (parent === v.id || seen.has(parent))
          throw new LocationError(
            "Không thể chọn chính vị trí hoặc vị trí con làm cấp trên.",
          );
        seen.add(parent);
        const row = map.get(parent);
        if (!row || !row.dang_su_dung)
          throw new LocationError(
            "Vị trí cấp trên không hợp lệ hoặc đã ngừng sử dụng.",
          );
        parent = row.parent_id;
      }
      if (!v.active && all.some((r) => r.parent_id === v.id))
        throw new LocationError(
          "Vị trí còn vị trí con. Hãy chuyển hoặc xóa vị trí con trước khi ngừng sử dụng.",
        );
      if (
        before &&
        (!v.active || !["PHONG", "KHU_VUC", "CHO_NGOI"].includes(v.type)) &&
        (await tx.nhan_su.count({
          where: {
            company_id: session.companyId,
            vi_tri_lam_viec_id: before.id,
          },
        }))
      )
        throw new LocationError(
          "Vị trí còn nhân sự liên kết. Hãy chuyển hoặc gỡ vị trí trong hồ sơ nhân sự trước.",
        );
      const data = {
        ten_vi_tri: v.name,
        loai_vi_tri: v.type,
        parent_id: v.parentId,
        mo_ta: v.description || null,
        dang_su_dung: v.active,
      };
      // Asset references are checked before any state change; no automatic unassignment.
      if (before && !v.active && await tx.tai_san.count({ where: { company_id: session.companyId, vi_tri_id: before.id } }))
        throw new LocationError("Vị trí còn tài sản. Hãy chuyển hoặc gỡ vị trí trong hồ sơ tài sản trước.");
      const after = before
        ? await tx.vi_tri.update({
          where: { id: before.id },
          data,
          select: selection,
        })
        : await tx.vi_tri.create({
          data: { ...data, company_id: session.companyId },
          select: selection,
        });
      const snapshot = (r: typeof after, path: string) => ({
        ...r,
        duong_dan: path,
        updated_at: r.updated_at.toISOString(),
      });
      await tx.nhat_ky_hoat_dong.create({
        data: {
          company_id: session.companyId,
          account_id: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          phan_he: "LOCATIONS",
          doi_tuong_id: `vi_tri:${after.id}`,
          ten_doi_tuong: after.ten_vi_tri,
          hanh_dong: before ? "UPDATE" : "CREATE",
          mo_ta: `${before ? "Cập nhật" : "Tạo"} vị trí ${after.ten_vi_tri} (${after.ma_vi_tri})`,
          du_lieu_cu: before
            ? snapshot(before, locationPath(before.id, all))
            : undefined,
          du_lieu_moi: snapshot(
            after,
            locationPath(after.id, [
              ...all.filter((r) => r.id !== after.id),
              after,
            ]),
          ),
        },
      });
      return after.id;
    });
    revalidatePath("/locations");
    revalidatePath("/office-3d/hcns");
    revalidatePath("/office-3d");
    return { success: true as const, id, message: "Đã lưu vị trí." };
  } catch (e) {
    return failure(e);
  }
}
// Fingerprint prevents a confirmation for one set of people deleting a changed set.
function assignmentVersion(people: { id: number; updated_at: Date; }[]) {
  return createHash("sha256").update(JSON.stringify(people.map((p) => [p.id, p.updated_at.toISOString()]).sort((a, b) => Number(a[0]) - Number(b[0])))).digest("hex");
}
export async function getLocationDeletionPreview(id: number) {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS", "MANAGE"))
    return { success: false as const, message: "Bạn không có quyền quản lý vị trí." };
  if (!z.number().int().positive().safeParse(id).success)
    return { success: false as const, message: "Vị trí không hợp lệ." };
  const location = await db.vi_tri.findFirst({ where: { id, company_id: session.companyId }, select: selection });
  if (!location) return { success: false as const, message: "Vị trí không tồn tại." };
  if (await db.tai_san.count({ where: { company_id: session.companyId, vi_tri_id: id } }))
    return { success: false as const, message: "Vị trí còn tài sản. Hãy chuyển hoặc gỡ vị trí trong hồ sơ tài sản trước." };
  if (await db.vi_tri.count({ where: { parent_id: id, company_id: session.companyId } }))
    return { success: false as const, message: "Vị trí còn vị trí con. Hãy chuyển hoặc xóa vị trí con trước." };
  // Do not expose identities/counts to a location manager without HR permissions.
  const canManageHR = hasPermission(session, "HR", "MANAGE");
  if (!canManageHR && await db.nhan_su.count({ where: { company_id: session.companyId, vi_tri_lam_viec_id: id } }))
    return { success: false as const, message: "Cần thêm quyền quản lý nhân sự để xóa vị trí này." };
  const people = canManageHR ? await db.nhan_su.findMany({
    where: { company_id: session.companyId, vi_tri_lam_viec_id: id },
    select: { id: true, ho_ten: true, updated_at: true },
  }) : [];
  return { success: true as const, id, name: location.ten_vi_tri, version: location.updated_at.toISOString(), assignmentVersion: assignmentVersion(people), people: people.map((p) => p.ho_ten) };
}
export async function deleteLocation(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "LOCATIONS", "MANAGE"))
    return {
      success: false as const,
      message: "Bạn không có quyền quản lý vị trí.",
    };
  const parsed = DeleteLocationSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false as const,
      message: "Vị trí hoặc phiên bản không hợp lệ.",
    };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      await currentActor(tx, session, "LOCATIONS");
      await tx.$queryRaw`SELECT id FROM vi_tri WHERE id = ${parsed.data.id} AND company_id = ${session.companyId} FOR UPDATE`;
      const before = await tx.vi_tri.findFirst({
        where: { id: parsed.data.id, company_id: session.companyId },
        select: selection,
      });
      if (!before) throw new LocationError("Vị trí không tồn tại.");
      if (await tx.tai_san.count({ where: { company_id: session.companyId, vi_tri_id: before.id } }))
        throw new LocationError("Vị trí còn tài sản. Hãy chuyển hoặc gỡ vị trí trong hồ sơ tài sản trước.");
      if (before.updated_at.toISOString() !== parsed.data.version)
        throw new LocationError(
          "Vị trí đã thay đổi. Tải lại trang trước khi xóa.",
        );
      if (
        await tx.vi_tri.count({
          where: { company_id: session.companyId, parent_id: before.id },
        })
      )
        throw new LocationError(
          "Vị trí còn vị trí con. Hãy chuyển hoặc xóa vị trí con trước.",
        );
      const people = await tx.nhan_su.findMany({
        where: { company_id: session.companyId, vi_tri_lam_viec_id: before.id },
        select: { id: true, ho_ten: true, updated_at: true },
      });
      if (people.length) {
        if (!hasPermission(session, "HR", "MANAGE"))
          throw new LocationError("Cần thêm quyền quản lý nhân sự để xóa vị trí này.");
        await currentActor(tx, session, "HR");
      }
      if ((people.length || parsed.data.assignmentVersion) && parsed.data.assignmentVersion !== assignmentVersion(people))
        throw new LocationError("Danh sách nhân sự đã thay đổi. Xem lại thông tin trước khi xác nhận xóa.");
      if (people.length) {
        const locations = await tx.vi_tri.findMany({
          where: { company_id: session.companyId },
          select: { id: true, parent_id: true, ten_vi_tri: true },
        });
        const oldPath = locationPath(before.id, locations);
        await tx.nhan_su.updateMany({
          where: { company_id: session.companyId, vi_tri_lam_viec_id: before.id },
          data: { vi_tri_lam_viec_id: null },
        });
        await tx.nhat_ky_hoat_dong.createMany({
          data: people.map((person) => ({
            company_id: session.companyId, account_id: session.userId,
            ten_dang_nhap: session.username, ho_ten: session.fullName,
            phan_he: "HR", hanh_dong: "UPDATE", doi_tuong_id: String(person.id), ten_doi_tuong: person.ho_ten,
            mo_ta: `Đưa về chưa xác định vị trí do xóa ${oldPath}.`,
            du_lieu_cu: { vi_tri_lam_viec_id: before.id, vi_tri: oldPath },
            du_lieu_moi: { vi_tri_lam_viec_id: null, vi_tri: "Chưa xác định vị trí" },
          }))
        });
      }
      await tx.vi_tri.delete({ where: { id: before.id } });
      await tx.nhat_ky_hoat_dong.create({
        data: {
          company_id: session.companyId,
          account_id: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          phan_he: "LOCATIONS",
          doi_tuong_id: `vi_tri:${before.id}`,
          ten_doi_tuong: before.ten_vi_tri,
          hanh_dong: "DELETE",
          mo_ta: `Xóa vị trí ${before.ten_vi_tri} (${before.ma_vi_tri})`,
          du_lieu_cu: {
            ...before,
            updated_at: before.updated_at.toISOString(),
          },
        },
      });
    });
    for (const path of ["/locations", "/employees", "/office-3d", "/office-3d/hcns"]) revalidatePath(path);
    return {
      success: true as const,
      message: "Đã xóa vị trí; nhân sự liên kết được đưa về chưa xác định vị trí. Lịch sử được giữ lại.",
    };
  } catch (e) {
    return failure(e);
  }
}
