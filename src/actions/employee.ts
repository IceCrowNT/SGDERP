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
  department: { select: { id: true, name: true } },
  _count: { select: { accounts: true } },
} as const;
export async function getEmployees(filter?: GetEmployeesFilter) {
  const session = await getSession();
  if (!session || !hasPermission(session, "HR"))
    return { success: false as const, message: "Không có quyền xem nhân sự." };
  const where: Prisma.EmployeeWhereInput = { companyId: session.companyId };
  if (filter?.status && filter.status !== "ALL")
    where.employmentStatus = filter.status;
  if (filter?.departmentId) {
    const departments = await db.department.findMany({
      where: { companyId: session.companyId },
      select: { id: true, parentId: true },
    });
    const ids = new Set([filter.departmentId]);
    for (const id of ids)
      for (const d of departments) if (d.parentId === id) ids.add(d.id);
    where.departmentId = { in: [...ids] };
  }
  if (filter?.search?.trim()) {
    const contains = filter.search.trim();
    where.OR = ["fullName", "employeeCode", "phone", "email", "position"].map(
      (key) => ({ [key]: { contains, mode: "insensitive" } }),
    );
  }
  const data = await db.employee.findMany({
    where,
    include: employeeInclude,
    orderBy: { employeeCode: "asc" },
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
  const data = await db.employee.findFirst({
    where: { id, companyId: session.companyId },
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
    return { success: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  const id = "id" in v ? (v.id as number) : undefined;
  try {
    await db.$transaction(async (tx) => {
      if (
        v.departmentId &&
        !(await tx.department.findFirst({
          where: { id: v.departmentId, companyId: session.companyId },
        }))
      )
        throw Error("Phòng ban không hợp lệ.");
      const previous = id
        ? await tx.employee.findFirst({
            where: { id, companyId: session.companyId },
          })
        : null;
      if (id && !previous) throw Error("Không tìm thấy nhân sự.");
      const data = {
        fullName: v.fullName,
        position: v.position || null,
        notes: v.notes || null,
        departmentId: v.departmentId,
        phone: v.phone || null,
        email: v.email || null,
        dateOfBirth: v.dateOfBirth ? new Date(v.dateOfBirth) : null,
        joinDate: v.joinDate ? new Date(v.joinDate) : null,
        employmentStatus: v.employmentStatus,
      };
      const person = id
        ? await tx.employee.update({ where: { id }, data })
        : await tx.employee.create({
            data: { ...data, companyId: session.companyId },
          });
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          username: session.username,
          fullName: session.fullName,
          companyId: session.companyId,
          action: id ? "UPDATE" : "CREATE",
          module: "HR",
          targetId: String(person.id),
          targetName: person.fullName,
          description: `${id ? "Cập nhật" : "Tạo"} hồ sơ nhân sự; không thay đổi tài khoản.`,
          oldData: previous ? JSON.parse(JSON.stringify(previous)) : undefined,
          newData: JSON.parse(JSON.stringify(person)),
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
