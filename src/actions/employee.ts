"use server";

import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  ResetPasswordSchema,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ResetPasswordInput,
} from "@/lib/validations/user";

export interface GetEmployeesFilter {
  search?: string;
  departmentId?: number;
  roleId?: number;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}

/**
 * 1. Lấy danh bạ danh sách nhân sự kèm thông tin phòng ban phân cấp và vai trò
 */
export async function getEmployees(filter?: GetEmployeesFilter) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    if (session.permissions?.HR === "NONE") {
      return { success: false, message: "Bạn không có quyền truy cập danh bạ nhân sự." };
    }

    const whereClause: any = {
      companyId: session.companyId,
    };

    // Lọc theo trạng thái
    if (filter?.status === "ACTIVE") {
      whereClause.isActive = true;
    } else if (filter?.status === "INACTIVE") {
      whereClause.isActive = false;
    }

    // Lọc theo vai trò
    if (filter?.roleId) {
      whereClause.roles = {
        some: {
          roleId: filter.roleId,
        },
      };
    }

    // Lọc theo phòng ban (Hỗ trợ lọc theo phòng cha thì lấy luôn toàn bộ nhân sự các phòng con)
    if (filter?.departmentId) {
      const departments = await db.department.findMany({
        where: { companyId: session.companyId },
        select: { id: true, parentId: true },
      });
      const targetIds = new Set<number>([filter.departmentId]);
      const pending = [filter.departmentId];
      while (pending.length) {
        const parentId = pending.pop();
        for (const department of departments) {
          if (department.parentId === parentId && !targetIds.has(department.id)) {
            targetIds.add(department.id);
            pending.push(department.id);
          }
        }
      }
      whereClause.departmentId = { in: [...targetIds] };
    }

    // Lọc theo từ khóa tìm kiếm (Tên, Mã NV, Username, SĐT, Email, Chức vụ)
    if (filter?.search?.trim()) {
      const q = filter.search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { employeeCode: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
      ];
    }

    const employees = await db.user.findMany({
      where: whereClause,
      include: {
        department: {
          include: {
            parent: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        roles: {
          include: {
            role: {
              select: { id: true, code: true, name: true },
            },
          },
          orderBy: { isPrimary: "desc" },
        },
      },
      orderBy: [{ departmentId: "asc" }, { employeeCode: "asc" }],
    });

    return {
      success: true,
      data: employees,
      canManage: session.permissions?.HR === "MANAGE",
    };
  } catch (error: any) {
    console.error("Lỗi getEmployees:", error);
    return { success: false, message: error.message || "Không thể tải danh sách nhân sự." };
  }
}

/**
 * 2. Lấy thông tin chi tiết một nhân viên
 */
export async function getEmployeeById(id: number) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    const employee = await db.user.findFirst({
      where: { id, companyId: session.companyId },
      include: {
        department: {
          include: {
            parent: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    if (!employee) {
      return { success: false, message: "Hồ sơ nhân sự không tồn tại." };
    }

    return { success: true, data: employee };
  } catch (error: any) {
    console.error("Lỗi getEmployeeById:", error);
    return { success: false, message: error.message || "Không thể tải chi tiết nhân sự." };
  }
}

/**
 * 3. Thêm mới nhân sự vào hệ thống
 */
export async function createEmployee(input: CreateEmployeeInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền thêm mới nhân sự." };
    }

    const parsed = CreateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const data = parsed.data;

    // Kiểm tra trùng username
    const existingUsername = await db.user.findUnique({
      where: { username: data.username.toLowerCase() },
    });
    if (existingUsername) {
      return { success: false, message: `Tên tài khoản "${data.username}" đã tồn tại.` };
    }

    // Kiểm tra trùng mã nhân viên
    const existingCode = await db.user.findFirst({
      where: { companyId: session.companyId, employeeCode: data.employeeCode.toUpperCase() },
    });
    if (existingCode) {
      return { success: false, message: `Mã nhân sự "${data.employeeCode}" đã được sử dụng.` };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const primaryId = data.primaryRoleId || data.roleIds[0];

    const newUser = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          employeeCode: data.employeeCode.toUpperCase(),
          username: data.username.toLowerCase(),
          password: hashedPassword,
          position: data.position || null,
          departmentId: data.departmentId || null,
          phone: data.phone || null,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          joinDate: data.joinDate ? new Date(data.joinDate) : null,
          isActive: true,
          companyId: session.companyId,
        },
      });

      // Gán danh sách vai trò
      for (const rId of data.roleIds) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: rId,
            isPrimary: rId === primaryId,
          },
        });
      }

      return user;
    });

    // Ghi nhật ký
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "CREATE",
      module: "HR",
      targetId: String(newUser.id),
      targetName: newUser.fullName,
      description: `Thêm mới hồ sơ cán bộ nhân viên: "${newUser.fullName}" (Mã: ${newUser.employeeCode}, Username: ${newUser.username})`,
      newData: newUser,
    });

    revalidatePath("/employees");
    revalidatePath("/departments");
    return { success: true, data: newUser, message: "Thêm nhân viên thành công!" };
  } catch (error: any) {
    console.error("Lỗi createEmployee:", error);
    return { success: false, message: error.message || "Lỗi khi thêm mới nhân sự." };
  }
}

/**
 * 4. Cập nhật hồ sơ nhân viên & điều chuyển phòng ban
 */
export async function updateEmployee(input: UpdateEmployeeInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền chỉnh sửa hồ sơ nhân sự." };
    }

    const parsed = UpdateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const data = parsed.data;

    // Kiểm tra nhân sự tồn tại
    const existing = await db.user.findFirst({
      where: { id: data.id, companyId: session.companyId },
      include: {
        department: true,
        roles: true,
      },
    });

    if (!existing) {
      return { success: false, message: "Nhân viên không tồn tại hoặc đã bị xóa." };
    }

    // Kiểm tra trùng mã nhân viên nếu đổi mã
    if (data.employeeCode.toUpperCase() !== existing.employeeCode) {
      const duplicateCode = await db.user.findFirst({
        where: {
          companyId: session.companyId,
          employeeCode: data.employeeCode.toUpperCase(),
          NOT: { id: data.id },
        },
      });
      if (duplicateCode) {
        return { success: false, message: `Mã nhân sự "${data.employeeCode}" đã được sử dụng bởi nhân viên khác.` };
      }
    }

    const primaryId = data.primaryRoleId || data.roleIds[0];

    const updatedUser = await db.$transaction(async (tx) => {
      // 1. Cập nhật thông tin hồ sơ & phòng ban
      const user = await tx.user.update({
        where: { id: data.id },
        data: {
          fullName: data.fullName,
          employeeCode: data.employeeCode.toUpperCase(),
          position: data.position || null,
          departmentId: data.departmentId || null,
          phone: data.phone || null,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          joinDate: data.joinDate ? new Date(data.joinDate) : null,
          isActive: data.isActive,
        },
      });

      // 2. Cập nhật danh sách vai trò
      await tx.userRole.deleteMany({
        where: { userId: data.id },
      });

      for (const rId of data.roleIds) {
        await tx.userRole.create({
          data: {
            userId: data.id,
            roleId: rId,
            isPrimary: rId === primaryId,
          },
        });
      }

      return user;
    });

    // Ghi nhật ký
    const transferNote =
      existing.departmentId !== updatedUser.departmentId
        ? ` (Điều chuyển phòng ban từ ID ${existing.departmentId || "Chưa có"} sang ID ${updatedUser.departmentId || "Chưa có"})`
        : "";

    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "UPDATE",
      module: "HR",
      targetId: String(updatedUser.id),
      targetName: updatedUser.fullName,
      description: `Cập nhật hồ sơ nhân sự: "${updatedUser.fullName}" (Mã: ${updatedUser.employeeCode})${transferNote}`,
      oldData: existing,
      newData: updatedUser,
    });

    revalidatePath("/employees");
    revalidatePath("/departments");
    return { success: true, data: updatedUser, message: "Cập nhật hồ sơ nhân viên thành công!" };
  } catch (error: any) {
    console.error("Lỗi updateEmployee:", error);
    return { success: false, message: error.message || "Lỗi khi cập nhật hồ sơ nhân sự." };
  }
}

/**
 * 5. Khóa hoặc Mở khóa tài khoản nhân sự
 */
export async function toggleEmployeeStatus(id: number) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền thay đổi trạng thái nhân sự." };
    }

    const user = await db.user.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!user) {
      return { success: false, message: "Nhân viên không tồn tại." };
    }

    if (user.username === "admin") {
      return { success: false, message: "Không thể khóa tài khoản Master Admin tối cao." };
    }

    const newStatus = !user.isActive;
    const updated = await db.user.update({
      where: { id },
      data: { isActive: newStatus },
    });

    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "STATUS_CHANGE",
      module: "HR",
      targetId: String(user.id),
      targetName: user.fullName,
      description: `${newStatus ? "Kích hoạt lại" : "Khóa ngừng hoạt động"} tài khoản nhân sự: "${user.fullName}" (${user.username})`,
      oldData: { isActive: user.isActive },
      newData: { isActive: updated.isActive },
    });

    revalidatePath("/employees");
    return {
      success: true,
      message: newStatus ? "Đã kích hoạt lại tài khoản thành công!" : "Đã khóa tài khoản thành công!",
      isActive: newStatus,
    };
  } catch (error: any) {
    console.error("Lỗi toggleEmployeeStatus:", error);
    return { success: false, message: error.message || "Lỗi khi thay đổi trạng thái." };
  }
}

/**
 * 6. Đặt lại mật khẩu cho nhân sự
 */
export async function resetEmployeePassword(input: ResetPasswordInput) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, message: "Phiên đăng nhập đã hết hạn." };
    }

    if (session.permissions?.HR !== "MANAGE") {
      return { success: false, message: "Bạn không có quyền đặt lại mật khẩu nhân viên." };
    }

    const parsed = ResetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, errors: parsed.error.flatten().fieldErrors };
    }

    const { userId, newPassword } = parsed.data;

    const user = await db.user.findFirst({
      where: { id: userId, companyId: session.companyId },
    });

    if (!user) {
      return { success: false, message: "Nhân viên không tồn tại." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "UPDATE",
      module: "AUTH",
      targetId: String(user.id),
      targetName: user.fullName,
      description: `Quản trị viên đặt lại mật khẩu cho tài khoản "${user.username}" (${user.fullName})`,
    });

    return { success: true, message: `Đã đổi mật khẩu mới cho tài khoản "${user.username}" thành công!` };
  } catch (error: any) {
    console.error("Lỗi resetEmployeePassword:", error);
    return { success: false, message: error.message || "Lỗi khi đặt lại mật khẩu." };
  }
}
