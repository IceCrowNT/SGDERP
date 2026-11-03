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
  const data = await db.tai_khoan.findMany({
    where: { dinh_danh_cong_ty: session!.companyId },
    select: {
      dinh_danh: true,
      ten_dang_nhap: true,
      ten_hien_thi: true,
      cho_phep_dang_nhap: true,
      dinh_danh_nhan_su: true,
      nhan_su: {
        select: { ho_ten: true, ma_nhan_su: true, tinh_trang_lam_viec: true },
      },
      danh_sach_vai_tro: { select: { dinh_danh_vai_tro: true, vai_tro: { select: { ten_vai_tro: true } } } },
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
        ? await tx.tai_khoan.findFirst({
            where: { dinh_danh: v.id, dinh_danh_cong_ty: session.companyId },
            select: { dinh_danh: true, ten_dang_nhap: true, dinh_danh_nhan_su: true },
          })
        : null;
      if (v.id && !previous) throw Error("Không tìm thấy tài khoản.");
      if (v.id === session.userId && !v.isActive)
        throw Error("Không thể tự khóa tài khoản đang sử dụng.");
      if (previous && previous.ten_dang_nhap !== v.username)
        throw Error("Tên đăng nhập không thay đổi trong bản này.");
      if (previous?.dinh_danh_nhan_su && !v.employeeId)
        throw Error("Tài khoản cá nhân phải có người sở hữu.");
      if (
        v.employeeId &&
        !(await tx.nhan_su.findFirst({
          where: { dinh_danh: v.employeeId, dinh_danh_cong_ty: session.companyId },
        }))
      )
        throw Error("Nhân sự không thuộc công ty.");
      const ids = [...new Set(v.roleIds)];
      if (
        (await tx.vai_tro.count({
          where: { dinh_danh: { in: ids }, dinh_danh_cong_ty: session.companyId },
        })) !== ids.length
      )
        throw Error("Vai trò không hợp lệ.");
      const data = {
        ten_hien_thi: v.displayName,
        dinh_danh_nhan_su: v.employeeId,
        cho_phep_dang_nhap: v.isActive,
        ...(password ? { mat_khau_bam: password } : {}),
      };
      const account = previous
        ? await tx.tai_khoan.update({
            where: { dinh_danh: previous.dinh_danh },
            data: { ...data, phien_ban_dang_nhap: { increment: 1 } },
          })
        : await tx.tai_khoan.create({
            data: {
              ...data,
              ten_dang_nhap: v.username,
              mat_khau_bam: password!,
              dinh_danh_cong_ty: session.companyId,
            },
          });
      await tx.tai_khoan_vai_tro.deleteMany({ where: { dinh_danh_tai_khoan: account.dinh_danh } });
      if (ids.length)
        await tx.tai_khoan_vai_tro.createMany({
          data: ids.map((roleId, i) => ({
            dinh_danh_tai_khoan: account.dinh_danh,
            dinh_danh_vai_tro: roleId,
            la_vai_tro_chinh: i === 0,
          })),
        });
      const admins = await tx.tai_khoan.count({
        where: {
          dinh_danh_cong_ty: session.companyId,
          cho_phep_dang_nhap: true,
          danh_sach_vai_tro: {
            some: {
              vai_tro: {
                dinh_danh_cong_ty: session.companyId,
                ma_vai_tro: { in: ["ADMIN", "IT_ADMIN"] },
              },
            },
          },
        },
      });
      if (!admins)
        throw Error("Phải giữ ít nhất một tài khoản quản trị hoạt động.");
      await tx.nhat_ky_hoat_dong.create({
        data: {
          dinh_danh_tai_khoan: session.userId,
          ten_dang_nhap: session.username,
          ho_ten: session.fullName,
          dinh_danh_cong_ty: session.companyId,
          hanh_dong: previous ? "UPDATE" : "CREATE",
          phan_he: "AUTH",
          dinh_danh_doi_tuong: String(account.dinh_danh),
          ten_doi_tuong: v.username,
          mo_ta: `${previous ? "Cập nhật" : "Tạo"} tài khoản; không thay đổi hồ sơ nhân sự.`,
          du_lieu_moi: {
            dinh_danh_nhan_su: v.employeeId,
            cho_phep_dang_nhap: v.isActive,
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
