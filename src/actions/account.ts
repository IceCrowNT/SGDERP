"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountSchema, type AccountInput } from "@/lib/validations/user";
import { canManageAccounts } from "@/lib/account-access";

export async function getAccounts() {
  const session = await getSession();
  if (!canManageAccounts(session))
    return {
      success: false as const,
      message: "Không có quyền quản lý tài khoản.",
    };
  const data = await db.user.findMany({
    where: { companyId: session!.companyId },
    select: {
      id: true,
      username: true,
      displayName: true,
      isActive: true,
      employeeId: true,
      employee: {
        select: { fullName: true, employeeCode: true, employmentStatus: true },
      },
      roles: { select: { roleId: true, role: { select: { name: true } } } },
    },
    orderBy: { username: "asc" },
  });
  return { success: true as const, data };
}
export async function saveAccount(input: AccountInput) {
  const session = await getSession();
  if (!session || !canManageAccounts(session))
    return { success: false, message: "Không có quyền quản lý tài khoản." };
  const parsed = AccountSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  if (!v.id && !v.password)
    return { success: false, message: "Nhập mật khẩu khởi tạo." };
  if (!v.id && !v.employeeId)
    return {
      success: false,
      message:
        "Chọn nhân sự sở hữu tài khoản. Tài khoản hệ thống hiện có được giữ riêng.",
    };
  const password = v.password ? await bcrypt.hash(v.password, 10) : undefined;
  try {
    await db.$transaction(async (tx) => {
      // Serialize account changes per company, including last-administrator checks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const previous = v.id
        ? await tx.user.findFirst({
            where: { id: v.id, companyId: session.companyId },
            select: { id: true, username: true, employeeId: true },
          })
        : null;
      if (v.id && !previous) throw Error("Không tìm thấy tài khoản.");
      if (v.id === session.userId && !v.isActive)
        throw Error("Không thể tự khóa tài khoản đang sử dụng.");
      if (previous && previous.username !== v.username)
        throw Error("Tên đăng nhập không thay đổi trong bản này.");
      if (previous?.employeeId && !v.employeeId)
        throw Error("Tài khoản cá nhân phải có người sở hữu.");
      if (
        v.employeeId &&
        !(await tx.employee.findFirst({
          where: { id: v.employeeId, companyId: session.companyId },
        }))
      )
        throw Error("Nhân sự không thuộc công ty.");
      const ids = [...new Set(v.roleIds)];
      if (
        (await tx.role.count({
          where: { id: { in: ids }, companyId: session.companyId },
        })) !== ids.length
      )
        throw Error("Vai trò không hợp lệ.");
      const data = {
        displayName: v.displayName,
        employeeId: v.employeeId,
        isActive: v.isActive,
        ...(password ? { password } : {}),
      };
      const account = previous
        ? await tx.user.update({
            where: { id: previous.id },
            data: { ...data, sessionVersion: { increment: 1 } },
          })
        : await tx.user.create({
            data: {
              ...data,
              username: v.username,
              password: password!,
              companyId: session.companyId,
            },
          });
      await tx.userRole.deleteMany({ where: { userId: account.id } });
      if (ids.length)
        await tx.userRole.createMany({
          data: ids.map((roleId, i) => ({
            userId: account.id,
            roleId,
            isPrimary: i === 0,
          })),
        });
      const admins = await tx.user.count({
        where: {
          companyId: session.companyId,
          isActive: true,
          roles: {
            some: {
              role: {
                companyId: session.companyId,
                code: { in: ["ADMIN", "IT_ADMIN"] },
              },
            },
          },
        },
      });
      if (!admins)
        throw Error("Phải giữ ít nhất một tài khoản quản trị hoạt động.");
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          username: session.username,
          fullName: session.fullName,
          companyId: session.companyId,
          action: previous ? "UPDATE" : "CREATE",
          module: "AUTH",
          targetId: String(account.id),
          targetName: v.username,
          description: `${previous ? "Cập nhật" : "Tạo"} tài khoản; không thay đổi hồ sơ nhân sự.`,
          newData: {
            employeeId: v.employeeId,
            isActive: v.isActive,
            roleIds: ids,
            passwordChanged: Boolean(password),
          },
        },
      });
    });
    revalidatePath("/accounts");
    revalidatePath("/employees");
    return {
      success: true,
      message:
        "Đã lưu tài khoản. Phiên cũ của tài khoản được sửa sẽ hết hiệu lực.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code === "P2002"
            ? "Tên đăng nhập đã tồn tại."
            : "Không thể lưu tài khoản. Vui lòng thử lại."
          : error instanceof Error
            ? error.message
            : "Không thể lưu tài khoản.",
    };
  }
}
