"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import {
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from "@/lib/validations/department";

const ONE_OFFICE_SYSTEM = "ONE_OFFICE";
const ROOT_EXTERNAL_IDS = new Set(["0", "23"]);

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export type DepartmentSyncStatus =
  | "MATCHED"
  | "NAME_MISMATCH"
  | "PARENT_MISMATCH"
  | "UNLINKED";

/** Đọc cơ cấu ERP kèm snapshot đối chiếu 1Office. */
export async function getDepartments() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false as const, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    }
    if (!["VIEW", "MANAGE"].includes(session.permissions?.HR ?? "")) {
      return { success: false as const, message: "Bạn không có quyền truy cập danh mục phòng ban." };
    }

    const company = await db.company.findUnique({ where: { id: session.companyId }, select: { name: true } });
    const departments = await db.department.findMany({
      where: { companyId: session.companyId },
      include: {
        users: {
          where: { companyId: session.companyId },
          select: { id: true, fullName: true, employeeCode: true, position: true },
          orderBy: { fullName: "asc" },
        },
        parent: { select: { id: true, code: true, name: true, externalId: true } },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            externalId: true,
            _count: { select: { users: true } },
          },
        },
        _count: { select: { users: true, children: true } },
      },
      orderBy: [{ externalLevel: "asc" }, { parentId: "asc" }, { code: "asc" }],
    });

    const data = departments.map((department) => {
      const linked = department.externalSystem === ONE_OFFICE_SYSTEM && Boolean(department.externalId);
      const nameMatches = linked && normalizeName(department.name) === normalizeName(department.externalName);
      const parentMatches = linked
        ? department.parentId
          ? department.parent?.externalId === department.externalParentId
          : ROOT_EXTERNAL_IDS.has(department.externalParentId ?? "")
        : false;

      let syncStatus: DepartmentSyncStatus = "MATCHED";
      if (!linked) syncStatus = "UNLINKED";
      else if (!nameMatches) syncStatus = "NAME_MISMATCH";
      else if (!parentMatches) syncStatus = "PARENT_MISMATCH";

      return {
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        parentId: department.parentId,
        parent: department.parent,
        children: department.children,
        employees: department.users,
        _count: department._count,
        source: {
          system: department.externalSystem,
          id: department.externalId,
          parentId: department.externalParentId,
          name: department.externalName,
          path: department.externalPath,
          level: department.externalLevel,
          supervisorName: department.externalSupervisorName,
          snapshotAt: department.externalSnapshotAt?.toISOString() ?? null,
        },
        syncStatus,
      };
    });

    const matched = data.filter((department) => department.syncStatus === "MATCHED").length;
    const linked = data.filter((department) => department.syncStatus !== "UNLINKED").length;
    const latestSnapshot = data
      .map((department) => department.source.snapshotAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return {
      success: true as const,
      data,
      companyName: company?.name ?? "Công ty",
      canManage: session.permissions?.HR === "MANAGE",
      comparison: {
        system: "1Office",
        sourceDepartmentRecords: linked,
        matched,
        issues: data.length - matched,
        snapshotAt: latestSnapshot ?? null,
      },
    };
  } catch (error: unknown) {
    console.error("Lỗi getDepartments:", error);
    return { success: false as const, message: errorMessage(error, "Không thể tải danh sách phòng ban.") };
  }
}

/** Cơ cấu chính thức phải được tạo tại 1Office rồi nhập lại vào ERP. */
export async function createDepartment(input: CreateDepartmentInput) {
  const session = await getSession();
  if (!session?.userId) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
  if (session.permissions?.HR !== "MANAGE") {
    return { success: false as const, message: "Bạn không có quyền thêm mới phòng ban." };
  }
  const parsed = CreateDepartmentSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, errors: parsed.error.flatten().fieldErrors };
  return {
    success: false as const,
    message: "1Office là nguồn chuẩn cơ cấu. Hãy tạo đơn vị tại 1Office rồi nhập snapshot mới vào ERP.",
  };
}

/** Chỉ sửa metadata nội bộ; tên và quan hệ cha của đơn vị đã liên kết phải theo 1Office. */
export async function updateDepartment(input: UpdateDepartmentInput) {
  try {
    const session = await getSession();
    if (!session?.userId) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
    if (session.permissions?.HR !== "MANAGE") {
      return { success: false as const, message: "Bạn không có quyền chỉnh sửa phòng ban." };
    }

    const parsed = UpdateDepartmentSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, errors: parsed.error.flatten().fieldErrors };
    const { id, name, code, description, parentId } = parsed.data;

    const existing = await db.department.findFirst({
      where: { id, companyId: session.companyId },
      include: { parent: { select: { externalId: true } } },
    });
    if (!existing) return { success: false as const, message: "Phòng ban không tồn tại." };

    if (existing.externalSystem === ONE_OFFICE_SYSTEM) {
      if (normalizeName(name) !== normalizeName(existing.externalName)) {
        return { success: false as const, message: "Tên đơn vị được quản lý tại 1Office và không thể sửa trực tiếp trong ERP." };
      }
      const requestedParent = parentId
        ? await db.department.findFirst({
            where: { id: parentId, companyId: session.companyId },
            select: { externalId: true },
          })
        : null;
      const parentMatches = parentId
        ? requestedParent?.externalId === existing.externalParentId
        : ROOT_EXTERNAL_IDS.has(existing.externalParentId ?? "");
      if (!parentMatches) {
        return { success: false as const, message: "Cấp trên của đơn vị được quản lý tại 1Office và không thể sửa trực tiếp trong ERP." };
      }
    }

    if (code !== existing.code) {
      const duplicate = await db.department.findUnique({
        where: { companyId_code: { companyId: session.companyId, code } },
        select: { id: true },
      });
      if (duplicate) return { success: false as const, message: `Mã phòng ban "${code}" đã được sử dụng.` };
    }

    const updated = await db.department.update({
      where: { id },
      data: { code, description: description || null, name, parentId: parentId || null },
      include: { parent: { select: { id: true, code: true, name: true } } },
    });

    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "UPDATE",
      module: "DEPARTMENT",
      targetId: String(updated.id),
      targetName: updated.name,
      description: `Cập nhật metadata ERP của đơn vị "${updated.name}" (${updated.code})`,
      oldData: existing,
      newData: updated,
    });

    revalidatePath("/departments");
    return { success: true as const, message: "Đã cập nhật metadata ERP của đơn vị." };
  } catch (error: unknown) {
    console.error("Lỗi updateDepartment:", error);
    return { success: false as const, message: errorMessage(error, "Lỗi khi cập nhật phòng ban.") };
  }
}

export async function deleteDepartment(id: number) {
  try {
    const session = await getSession();
    if (!session?.userId) return { success: false as const, message: "Phiên đăng nhập đã hết hạn." };
    if (session.permissions?.HR !== "MANAGE") {
      return { success: false as const, message: "Bạn không có quyền xóa phòng ban." };
    }

    const department = await db.department.findFirst({
      where: { id, companyId: session.companyId },
      include: { _count: { select: { users: true, children: true } } },
    });
    if (!department) return { success: false as const, message: "Phòng ban không tồn tại." };
    if (department.externalSystem === ONE_OFFICE_SYSTEM) {
      return { success: false as const, message: "Đơn vị đã liên kết 1Office không thể xóa trực tiếp trong ERP." };
    }
    if (department._count.children > 0 || department._count.users > 0) {
      return { success: false as const, message: "Không thể xóa đơn vị đang có bộ phận con hoặc nhân sự." };
    }

    await db.department.delete({ where: { id } });
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "DELETE",
      module: "DEPARTMENT",
      targetId: String(id),
      targetName: department.name,
      description: `Xóa đơn vị nội bộ chưa liên kết: "${department.name}" (${department.code})`,
      oldData: department,
    });
    revalidatePath("/departments");
    return { success: true as const, message: "Đã xóa phòng ban." };
  } catch (error: unknown) {
    console.error("Lỗi deleteDepartment:", error);
    return { success: false as const, message: errorMessage(error, "Lỗi khi xóa phòng ban.") };
  }
}
