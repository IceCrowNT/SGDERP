"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSession, hasPermission } from "@/lib/auth";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/validations/user";

export interface GetEmployeesFilter {
  search?: string;
  departmentId?: number;
  status?: "ALL" | "ACTIVE" | "LEFT" | "UNKNOWN";
}
const employeeInclude = {
  phong_ban: { select: { dinh_danh: true, ten_phong_ban: true } },
  _count: { select: { danh_sach_tai_khoan: true } },
} as const;
export async function getEmployees(filter?: GetEmployeesFilter) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR"))
    return { success: false as const, message: "Không có quyền xem nhân sự." };
  const where: Prisma.nhan_suWhereInput = { dinh_danh_cong_ty: session.companyId };
  if (filter?.status && filter.status !== "ALL")
    where.tinh_trang_lam_viec = filter.status;
  if (filter?.departmentId) {
    const departments = await db.phong_ban.findMany({
      where: { dinh_danh_cong_ty: session.companyId },
      select: { dinh_danh: true, dinh_danh_phong_ban_cha: true },
    });
    const ids = new Set([filter.departmentId]);
    for (const id of ids)
      for (const d of departments) if (d.dinh_danh_phong_ban_cha === id) ids.add(d.dinh_danh);
    where.dinh_danh_phong_ban = { in: [...ids] };
  }
  if (filter?.search?.trim()) {
    const contains = filter.search.trim();
    where.OR = ["ho_ten", "ma_nhan_su", "so_dien_thoai", "thu_dien_tu", "chuc_vu"].map(
      (key) => ({ [key]: { contains, mode: "insensitive" } }),
    );
  }
  const data = await db.nhan_su.findMany({
    where,
    include: employeeInclude,
    orderBy: { ma_nhan_su: "asc" },
  });
  return {
    success: true as const,
    data,
    canManage: hasPermission(session, "HR", "MANAGE"),
  };
}
export async function getEmployeeById(id: number) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR") || !Number.isInteger(id))
    return { success: false as const, message: "Không có quyền xem hồ sơ." };
  const data = await db.nhan_su.findFirst({
    where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId },
    include: employeeInclude,
  });
  return data
    ? { success: true as const, data }
    : { success: false as const, message: "Không tìm thấy nhân sự." };
}
async function saveEmployee(input: unknown, updating: boolean) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR", "MANAGE"))
    return { success: false, message: "Không có quyền sửa nhân sự." };
  const parsed = (
    updating ? UpdateEmployeeSchema : CreateEmployeeSchema
  ).safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const id = "id" in v ? (v.id as number) : undefined;
  try {
    await db.$transaction(async (tx) => {
      if (
        v.departmentId &&
        !(await tx.phong_ban.findFirst({
          where: { dinh_danh: v.departmentId, dinh_danh_cong_ty: session.companyId },
        }))
      )
        throw Error("Phòng ban không hợp lệ.");
      const previous = id
        ? await tx.nhan_su.findFirst({
            where: { dinh_danh: id, dinh_danh_cong_ty: session.companyId },
          })
        : null;
      if (id && !previous) throw Error("Không tìm thấy nhân sự.");
      const data = {
        ho_ten: v.fullName,
        chuc_vu: v.position || null,
        ghi_chu: v.notes || null,
        dinh_danh_phong_ban: v.departmentId,
        so_dien_thoai: v.phone || null,
        thu_dien_tu: v.email || null,
        ngay_sinh: v.dateOfBirth ? new Date(v.dateOfBirth) : null,
        ngay_vao_lam: v.joinDate ? new Date(v.joinDate) : null,
        tinh_trang_lam_viec: v.employmentStatus,
      };
      const person = id
        ? await tx.nhan_su.update({ where: { dinh_danh: id }, data })
        : await tx.nhan_su.create({
            data: { ...data, dinh_danh_cong_ty: session.companyId },
          });
      await tx.nhat_ky_hoat_dong.create({
        data: {
          dinh_danh_tai_khoan: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          dinh_danh_cong_ty: session.companyId,
          hanh_dong: id ? "UPDATE" : "CREATE",
          phan_he: "HR",
          dinh_danh_doi_tuong: String(person.dinh_danh),
          ten_doi_tuong: person.ho_ten,
          mo_ta: `${id ? "Cập nhật" : "Tạo"} hồ sơ nhân sự; không thay đổi tài khoản.`,
          du_lieu_cu: previous ? JSON.parse(JSON.stringify(previous)) : undefined,
          du_lieu_moi: JSON.parse(JSON.stringify(person)),
        },
      });
    });
    for (const path of [
      "/employees",
      "/departments",
      "/office-3d",
      "/accounts",
      "/",
    ])
      revalidatePath(path);
    return {
      success: true,
      message: "Đã lưu hồ sơ nhân sự. Tài khoản được quản lý riêng.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code === "P2002"
            ? "Mã nhân sự đã tồn tại trong công ty."
            : "Không thể lưu hồ sơ. Kiểm tra lại dữ liệu liên kết."
          : error instanceof Error
            ? error.message
            : "Không thể lưu hồ sơ.",
    };
  }
}
export async function createEmployee(input: CreateEmployeeInput) {
  return saveEmployee(input, false);
}
export async function updateEmployee(input: UpdateEmployeeInput) {
  return saveEmployee(input, true);
}
