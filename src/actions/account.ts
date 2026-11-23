"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { allocateUsername, defaultRole } from "@/lib/account-defaults";
import * as bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountSchema, type AccountInput } from "@/lib/validations/user";
import { assertAssignableRoles, ensureAdministrator } from "@/lib/rbac-server";
import { canManageAccounts } from "@/lib/account-access";

export async function getAccounts() {
  const session = await getSession();
  if (!canManageAccounts(session))
    return {
      success: false as const,
      message: "Không có quyền quản lý tài khoản.",
    };
  const data = await db.tai_khoan.findMany({
    where: { company_id: session!.companyId },
    select: {
      id: true,
      ten_dang_nhap: true,
      ten_hien_thi: true,
      cho_phep_dang_nhap: true,
      employee_id: true,
      nhan_su: {
        select: { ho_ten: true, ma_nhan_su: true, tinh_trang_lam_viec: true },
      },
      danh_sach_vai_tro: {
        select: {
          role_id: true,
          vai_tro: { select: { ten_vai_tro: true } },
        },
      },
    },
    orderBy: { ten_dang_nhap: "asc" },
  });
  return { success: true as const, data };
}
export async function saveAccount(input: AccountInput) {
  const session = await getSession();
  if (!session || !canManageAccounts(session))
    return { success: false, message: "Không có quyền quản lý tài khoản." };
  const parsed = AccountSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  if (!v.id && !v.employeeId)
    return {
      success: false,
      message:
        "Chọn nhân sự sở hữu tài khoản. Tài khoản hệ thống hiện có được giữ riêng.",
      fieldErrors: { employeeId: ["Chọn nhân sự sở hữu tài khoản"] },
    };
  const initialPassword =
    v.password || (!v.id ? randomBytes(15).toString("base64url") : undefined);
  const password = initialPassword
    ? await bcrypt.hash(initialPassword, 10)
    : undefined;
  let credentials: { username: string; password: string } | undefined;
  try {
    await db.$transaction(async (tx) => {
      // Serialize account changes per company, including last-administrator checks.
      await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
      const previous = v.id
        ? await tx.tai_khoan.findFirst({
            where: { id: v.id, company_id: session.companyId },
            select: {
              id: true,
              ten_dang_nhap: true,
              employee_id: true,
              danh_sach_vai_tro: true,
            },
          })
        : null;
      if (v.id && !previous) throw Error("Không tìm thấy tài khoản.");
      if (v.id === session.userId && !v.isActive)
        throw Error("Không thể tự khóa tài khoản đang sử dụng.");
      if (previous && previous.ten_dang_nhap !== v.username)
        throw Error("Tên đăng nhập không thay đổi trong bản này.");
      if (previous?.employee_id && !v.employeeId)
        throw Error("Tài khoản cá nhân phải có người sở hữu.");
      if (v.employeeId) {
        const person = await tx.nhan_su.findFirst({
          where: {
            id: v.employeeId,
            company_id: session.companyId,
          },
        });
        if (!person) throw Error("Nhân sự không thuộc công ty.");
        if (v.isActive && person.tinh_trang_lam_viec === "LEFT")
          throw Error("Không thể mở tài khoản của nhân sự đã nghỉ việc.");
      }
      const ids = [...new Set(v.roleIds)];
      await assertAssignableRoles(
        tx,
        session,
        ids,
        previous?.danh_sach_vai_tro.map((r) => r.role_id) ?? [],
      );
      if (!v.id && !ids.length)
        ids.push(await defaultRole(tx, session.companyId));
      const person = v.employeeId
        ? await tx.nhan_su.findFirstOrThrow({
            where: {
              id: v.employeeId,
              company_id: session.companyId,
            },
          })
        : null;
      const generatedUsername = !v.id
        ? await allocateUsername(tx, person!.ho_ten, person!.id)
        : "";
      const data = {
        ten_hien_thi: v.displayName,
        employee_id: v.employeeId,
        cho_phep_dang_nhap: v.isActive,
        ...(password
          ? { mat_khau_bam: password, bat_buoc_doi_mat_khau: true }
          : {}),
      };
      const account = previous
        ? await tx.tai_khoan.update({
            where: { id: previous.id },
            data: { ...data, phien_ban_dang_nhap: { increment: 1 } },
          })
        : await tx.tai_khoan.create({
            data: {
              ...data,
              ten_dang_nhap: v.username || generatedUsername,
              mat_khau_bam: password!,
              company_id: session.companyId,
            },
          });
      if (initialPassword)
        credentials = {
          username: account.ten_dang_nhap,
          password: initialPassword,
        };
      await tx.tai_khoan_vai_tro.deleteMany({
        where: { account_id: account.id },
      });
      if (ids.length)
        await tx.tai_khoan_vai_tro.createMany({
          data: ids.map((roleId, i) => ({
            account_id: account.id,
            role_id: roleId,
            la_vai_tro_chinh: i === 0,
          })),
        });
      await ensureAdministrator(tx, session.companyId);
      await tx.nhat_ky_hoat_dong.create({
        data: {
          account_id: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          company_id: session.companyId,
          hanh_dong: previous ? "UPDATE" : "CREATE",
          phan_he: "AUTH",
          doi_tuong_id: String(account.id),
          ten_doi_tuong: account.ten_dang_nhap,
          mo_ta: `${previous ? "Cập nhật" : "Tạo"} tài khoản; không thay đổi hồ sơ nhân sự.`,
          du_lieu_moi: {
            employee_id: v.employeeId,
            cho_phep_dang_nhap: v.isActive,
            roleIds: ids,
            passwordChanged: Boolean(password),
          },
        },
      });
    });
    revalidatePath("/", "layout");
    revalidatePath("/accounts");
    revalidatePath("/employees");
    return {
      success: true,
      credentials,
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
          : error instanceof Error && error.constructor === Error
            ? error.message
            : "Không thể lưu tài khoản.",
    };
  }
}
