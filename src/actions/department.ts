"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import {
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@/lib/validations/department";

/**
 * 1. Lấy danh sách toàn bộ phòng ban dạng phẳng & cây phân cấp
 */
export async function getDepartments() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    }

    if (session.permissions?.HR === "NONE") {
      return { success: false, message: "Bạn không có quyền truy cập danh mục phòng ban." };
    }

    const departments = await db.department.findMany({
      where: {
        companyId: session.companyId,
      },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: { id: true, code: true, name: true, _count: { select: { users: true } } },
        },
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
      orderBy: [{ parentId: "asc" }, { code: "asc" }],
    });

    return {
      success: true,
      data: departments,
      canManage: session.permissions?.HR === "MANAGE",
    };
  } catch (error: any) {
    console.error("Lỗi getDepartments:", error);
    return { success: false, message: error.message || "Không thể tải danh sách phòng ban." };
  }
}

/**
 * 2. Tạo mới phòng ban (Cha hoặc Bộ phận con)
 */
export async function createDepartment(input: CreateDepartmentInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    // RBAC Guard
    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền thêm mới phòng ban." };
    }

    // Validation
    const parsed = CreateDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const { name, code, description, parentId } = parsed.data;

    // Kiểm tra trùng mã phòng ban trong công ty
    const existingCode = await db.department.findUnique({
      where: {
        companyId_code: {
          companyId: session.companyId,
          code,
        },
      },
    });

    if (existingCode) {
      return { success: false, message: `Mã phòng ban "${code}" đã tồn tại. Vui lòng chọn mã khác.` };
    }

    // Nếu chọn phòng ban cha, kiểm tra phòng ban cha có hợp lệ không
    if (parentId) {
      const parentDept = await db.department.findFirst({
        where: { id: parentId, companyId: session.companyId },
      });
      if (!parentDept) {
        return { success: false, message: "Phòng ban cha được chọn không tồn tại." };
      }
    }

    const newDepartment = await db.department.create({
      data: {
        name,
        code,
        description: description || null,
        parentId: parentId || null,
        companyId: session.companyId,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    // Ghi nhật ký Audit Log
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "CREATE",
      module: "DEPARTMENT",
      targetId: String(newDepartment.id),
      targetName: newDepartment.name,
      description: `Thêm mới phòng ban/bộ phận: "${newDepartment.name}" (${newDepartment.code})${
        newDepartment.parent ? ` trực thuộc "${newDepartment.parent.name}"` : " (Cấp Tập đoàn)"
      }`,
      newData: newDepartment,
    });

    revalidatePath("/departments");
    return { success: true, data: newDepartment, message: "Tạo phòng ban thành công!" };
  } catch (error: any) {
    console.error("Lỗi createDepartment:", error);
    return { success: false, message: error.message || "Lỗi khi tạo phòng ban mới." };
  }
}

/**
 * 3. Chỉnh sửa thông tin phòng ban
 */
export async function updateDepartment(input: UpdateDepartmentInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    // RBAC Guard
    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền chỉnh sửa phòng ban." };
    }

    // Validation
    const parsed = UpdateDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const { id, name, code, description, parentId } = parsed.data;

    // Kiểm tra phòng ban tồn tại
    const existing = await db.department.findFirst({
      where: { id, companyId: session.companyId },
      include: { children: { select: { id: true } } },
    });

    if (!existing) {
      return { success: false, message: "Phòng ban không tồn tại hoặc đã bị xóa." };
    }

    // Không cho phép tự chọn chính mình làm cha
    if (parentId && parentId === id) {
      return { success: false, message: "Phòng ban không thể trực thuộc chính nó." };
    }

    // Không cho phép chọn bộ phận con làm phòng cha (tránh vòng lặp luẩn quẩn)
    if (parentId && existing.children.some((c) => c.id === parentId)) {
      return { success: false, message: "Không thể chọn bộ phận con làm phòng ban cha." };
    }

    // Kiểm tra trùng mã code nếu đổi mã
    if (code !== existing.code) {
      const duplicateCode = await db.department.findUnique({
        where: {
          companyId_code: {
            companyId: session.companyId,
            code,
          },
        },
      });
      if (duplicateCode) {
        return { success: false, message: `Mã phòng ban "${code}" đã được sử dụng bởi đơn vị khác.` };
      }
    }

    const updatedDepartment = await db.department.update({
      where: { id },
      data: {
        name,
        code,
        description: description || null,
        parentId: parentId || null,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });

    // Ghi nhật ký Audit Log
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "UPDATE",
      module: "DEPARTMENT",
      targetId: String(updatedDepartment.id),
      targetName: updatedDepartment.name,
      description: `Cập nhật thông tin phòng ban: "${updatedDepartment.name}" (${updatedDepartment.code})`,
      oldData: existing,
      newData: updatedDepartment,
    });

    revalidatePath("/departments");
    return { success: true, data: updatedDepartment, message: "Cập nhật phòng ban thành công!" };
  } catch (error: any) {
    console.error("Lỗi updateDepartment:", error);
    return { success: false, message: error.message || "Lỗi khi cập nhật phòng ban." };
  }
}

/**
 * 4. Xóa phòng ban an toàn (Chặn nếu còn nhân sự hoặc bộ phận con)
 */
export async function deleteDepartment(id: number) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    // RBAC Guard
    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền xóa phòng ban." };
    }

    const department = await db.department.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
    });

    if (!department) {
      return { success: false, message: "Phòng ban không tồn tại." };
    }

    // RÀNG BUỘC TOÀN VẸN: Không được xóa nếu còn bộ phận con
    if (department._count.children > 0) {
      return {
        success: false,
        message: `Không thể xóa đơn vị này vì đang có ${department._count.children} bộ phận con trực thuộc. Vui lòng chuyển hoặc xóa các bộ phận con trước.`,
      };
    }

    // RÀNG BUỘC TOÀN VẸN: Không được xóa nếu còn nhân sự trực thuộc
    if (department._count.users > 0) {
      return {
        success: false,
        message: `Không thể xóa phòng ban này vì đang có ${department._count.users} cán bộ nhân viên đang công tác. Vui lòng điều chuyển nhân sự sang đơn vị khác trước.`,
      };
    }

    await db.department.delete({
      where: { id },
    });

    // Ghi nhật ký Audit Log
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "DELETE",
      module: "DEPARTMENT",
      targetId: String(id),
      targetName: department.name,
      description: `Xóa phòng ban/đơn vị: "${department.name}" (${department.code})`,
      oldData: department,
    });

    revalidatePath("/departments");
    return { success: true, message: "Đã xóa phòng ban thành công!" };
  } catch (error: any) {
    console.error("Lỗi deleteDepartment:", error);
    return { success: false, message: error.message || "Lỗi khi xóa phòng ban." };
  }
}
