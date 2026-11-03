"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  CreateDepartmentSchema, UpdateDepartmentSchema,
  type CreateDepartmentInput, type UpdateDepartmentInput,
} from "@/lib/validations/department";

function failure(error: unknown) {
  const message = error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002" ? "Mã phòng ban đã được sử dụng."
      : error.code === "P2003" ? "Phòng ban còn dữ liệu liên kết, không thể xóa."
      : "Không thể lưu phòng ban. Vui lòng thử lại."
    : error instanceof Error ? error.message : "Không thể xử lý phòng ban.";
  return { success: false as const, message };
}
function refreshDepartments() {
  for (const path of ["/departments", "/employees", "/accounts", "/office-3d", "/"])
    revalidatePath(path);
}

export async function getDepartments() {
  try {
    const session = await getSession();
    if (!session) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
    if (!["VIEW", "MANAGE"].includes(session.permissions.HR ?? ""))
      return { success: false as const, message: "Bạn không có quyền truy cập danh mục phòng ban." };
    const company = await db.cong_ty.findUnique({ where: { dinh_danh: session.companyId }, select: { ten_cong_ty: true } });
    const data = await db.phong_ban.findMany({
      where: { dinh_danh_cong_ty: session.companyId },
      select: {
        dinh_danh: true, ma_phong_ban: true, ten_phong_ban: true, mo_ta: true, dinh_danh_phong_ban_cha: true,
        danh_sach_nhan_su: {
          where: { dinh_danh_cong_ty: session.companyId },
          select: { dinh_danh: true, ho_ten: true, ma_nhan_su: true, chuc_vu: true },
          orderBy: { ho_ten: "asc" },
        },
        _count: { select: { danh_sach_nhan_su: true, phong_ban_con: true } },
      },
      orderBy: { ma_phong_ban: "asc" },
    });
    return { success: true as const, data, companyName: company?.ten_cong_ty ?? "Công ty", canManage: session.permissions.HR === "MANAGE" };
  } catch (error) { return failure(error); }
}

async function saveDepartment(input: unknown, updating: boolean) {
  const session = await getSession();
  if (!session) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
  if (session.permissions.HR !== "MANAGE")
    return { success: false as const, message: "Bạn không có quyền quản lý phòng ban." };
  const parsed = (updating ? UpdateDepartmentSchema : CreateDepartmentSchema).safeParse(input);
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message, fieldErrors: parsed.error.flatten().fieldErrors };
  const values = parsed.data;
  const id = "id" in values ? values.id as number : undefined;
  try {
    const saved = await db.$transaction(async (tx) => {
      // Serialize hierarchy changes so simultaneous moves cannot create a cycle.
      await tx.$queryRaw`SELECT dinh_danh FROM cong_ty WHERE dinh_danh = ${session.companyId} FOR UPDATE`;
      const previous = id ? await tx.phong_ban.findFirst({ where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId } }) : null;
      if (id && !previous) throw Error("Phòng ban không tồn tại.");
      const parentId = values.parentId ?? null;
      if (parentId !== null) {
        const departments = await tx.phong_ban.findMany({ where: { dinh_danh_cong_ty: session.companyId }, select: { dinh_danh: true, dinh_danh_phong_ban_cha: true } });
        const parents = new Map(departments.map(d => [d.dinh_danh, d.dinh_danh_phong_ban_cha]));
        if (!parents.has(parentId)) throw Error("Phòng ban cấp trên không hợp lệ.");
        const visited = new Set<number>();
        let current: number | null = parentId;
        while (current !== null) {
          if (current === id || visited.has(current)) throw Error("Không thể chọn chính phòng ban hoặc đơn vị con làm cấp trên.");
          if (!parents.has(current)) throw Error("Cây phòng ban cấp trên không hợp lệ.");
          visited.add(current);
          current = parents.get(current) ?? null;
        }
      }
      const data = { ten_phong_ban: values.name, ma_phong_ban: values.code, mo_ta: values.description || null, dinh_danh_phong_ban_cha: parentId };
      const department = id
        ? await tx.phong_ban.update({ where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId }, data })
        : await tx.phong_ban.create({ data: { ...data, dinh_danh_cong_ty: session.companyId } });
      const snapshot = (d: typeof department) => ({ id: d.dinh_danh, name: d.ten_phong_ban, code: d.ma_phong_ban, description: d.mo_ta, parentId: d.dinh_danh_phong_ban_cha });
      await tx.nhat_ky_hoat_dong.create({ data: {
        dinh_danh_cong_ty: session.companyId, dinh_danh_tai_khoan: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
        hanh_dong: id ? "UPDATE" : "CREATE", phan_he: "DEPARTMENT", dinh_danh_doi_tuong: String(department.dinh_danh), ten_doi_tuong: department.ten_phong_ban,
        mo_ta: `${id ? "Cập nhật" : "Tạo"} phòng ban "${department.ten_phong_ban}" (${department.ma_phong_ban})`,
        du_lieu_cu: previous ? snapshot(previous) : undefined, du_lieu_moi: snapshot(department),
      } });
      return department.dinh_danh;
    });
    refreshDepartments();
    return { success: true as const, id: saved, message: "Đã lưu phòng ban." };
  } catch (error) { return failure(error); }
}
export async function createDepartment(input: CreateDepartmentInput) { return saveDepartment(input, false); }
export async function updateDepartment(input: UpdateDepartmentInput) { return saveDepartment(input, true); }

export async function deleteDepartment(id: number) {
  const session = await getSession();
  if (!session) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
  if (session.permissions.HR !== "MANAGE") return { success: false as const, message: "Bạn không có quyền quản lý phòng ban." };
  if (!z.number().int().positive().safeParse(id).success) return { success: false as const, message: "Phòng ban không hợp lệ." };
  try {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT dinh_danh FROM cong_ty WHERE dinh_danh = ${session.companyId} FOR UPDATE`;
      // Block new FK references until the emptiness check and deletion commit.
      await tx.$queryRaw`SELECT dinh_danh FROM phong_ban WHERE dinh_danh = ${id} AND dinh_danh_cong_ty = ${session.companyId} FOR UPDATE`;
      const department = await tx.phong_ban.findFirst({ where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId }, include: { _count: { select: { danh_sach_nhan_su: true, phong_ban_con: true } } } });
      if (!department) throw Error("Phòng ban không tồn tại.");
      if (department._count.phong_ban_con || department._count.danh_sach_nhan_su)
        throw Error("Không thể xóa phòng ban đang có đơn vị con hoặc nhân sự. Hãy chuyển các dữ liệu này trước.");
      await tx.phong_ban.delete({ where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId } });
      await tx.nhat_ky_hoat_dong.create({ data: {
        dinh_danh_cong_ty: session.companyId, dinh_danh_tai_khoan: session.userId, ten_dang_nhap: session.username, ho_ten: session.fullName,
        hanh_dong: "DELETE", phan_he: "DEPARTMENT", dinh_danh_doi_tuong: String(id), ten_doi_tuong: department.ten_phong_ban,
        mo_ta: `Xóa phòng ban "${department.ten_phong_ban}" (${department.ma_phong_ban})`,
        du_lieu_cu: { id, code: department.ma_phong_ban, name: department.ten_phong_ban, description: department.mo_ta, parentId: department.dinh_danh_phong_ban_cha },
      } });
    });
    refreshDepartments();
    return { success: true as const, message: "Đã xóa phòng ban." };
  } catch (error) { return failure(error); }
}
