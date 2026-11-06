"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hasPermission, type SessionUser } from "@/lib/auth";
import {
  isEditableGrant,
  permissionLevels,
  workflowActions,
} from "@/lib/role-catalog";
import { currentActor, ensureAdministrator } from "@/lib/rbac-server";
import {
  RoleSchema,
  RoleDeleteSchema,
  RoleAssignmentSchema,
} from "@/lib/validations/role";

export async function getRoles() {
  const session = await getSession();
  if (!session || !hasPermission(session, "ROLES"))
    return { success: false as const, message: "Không có quyền xem vai trò." };
  const [roles, accounts] = await Promise.all([
    db.vai_tro.findMany({
      where: { company_id: session.companyId },
      include: {
        danh_sach_quyen: { include: { quyen: true } },
        _count: { select: { danh_sach_tai_khoan: true } },
      },
      orderBy: { ten_vai_tro: "asc" },
    }),
    db.tai_khoan.findMany({
      where: { company_id: session.companyId },
      select: {
        id: true,
        ten_dang_nhap: true,
        ten_hien_thi: true,
        cho_phep_dang_nhap: true,
        updated_at: true,
        nhan_su: { select: { ho_ten: true, tinh_trang_lam_viec: true } },
        danh_sach_vai_tro: { select: { role_id: true } },
      },
      orderBy: { ten_dang_nhap: "asc" },
    }),
  ]);
  return {
    success: true as const,
    canManage: hasPermission(session, "ROLES", "MANAGE"),
    roles: roles.map((r) => ({
      id: r.id,
      code: r.ma_vai_tro,
      name: r.ten_vai_tro,
      description: r.mo_ta ?? "",
      system: r.la_vai_tro_he_thong,
      version: r.updated_at.toISOString(),
      accountCount: r._count.danh_sach_tai_khoan,
      permissions: permissionLevels(r.danh_sach_quyen.map((p) => p.quyen)),
      workflowActions: workflowActions(r.danh_sach_quyen.map((p) => p.quyen)),
      retainedPermissions: r.danh_sach_quyen
        .filter((p) => !isEditableGrant(p.quyen))
        .map(
          (p) =>
            `${p.quyen.phan_he} / ${p.quyen.hanh_dong} / ${p.quyen.pham_vi}`,
        ),
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      username: a.ten_dang_nhap,
      name: a.nhan_su?.ho_ten ?? a.ten_hien_thi,
      active: a.cho_phep_dang_nhap && a.nhan_su?.tinh_trang_lam_viec !== "LEFT",
      version: a.updated_at.toISOString(),
      roleIds: a.danh_sach_vai_tro.map((r) => r.role_id),
    })),
  };
}
function message(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    return error.code === "P2002"
      ? "Mã vai trò đã tồn tại."
      : "Không thể lưu thay đổi. Vui lòng tải lại và thử lại.";
  return error instanceof Error ? error.message : "Không thể lưu thay đổi.";
}
async function lock(tx: Prisma.TransactionClient, session: SessionUser) {
  await tx.$queryRaw`SELECT id FROM cong_ty WHERE id = ${session.companyId} FOR UPDATE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(260126, ${session.companyId}::int)`;
  await currentActor(tx, session, "ROLES");
}
async function audit(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  action: string,
  id: number,
  name: string,
  oldData: Prisma.InputJsonValue,
  newData: Prisma.InputJsonValue,
) {
  await tx.nhat_ky_hoat_dong.create({
    data: {
      company_id: session.companyId,
      account_id: session.userId,
      ten_dang_nhap: session.username,
      ho_ten: session.fullName,
      phan_he: "ROLE",
      hanh_dong: action,
      doi_tuong_id: String(id),
      ten_doi_tuong: name,
      mo_ta:
        action === "DELETE"
          ? "Xóa vai trò chưa được sử dụng."
          : "Cập nhật vai trò/quyền tài khoản; hiệu lực từ yêu cầu tiếp theo.",
      du_lieu_cu: oldData,
      du_lieu_moi: newData,
    },
  });
}
export async function saveRole(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "ROLES", "MANAGE"))
    return { success: false, message: "Không có quyền quản lý vai trò." };
  const parsed = RoleSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: "Kiểm tra các trường được đánh dấu.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  if (v.code === "DEFAULT")
    return {
      success: false,
      message:
        "DEFAULT cố định quyền cá nhân. Hãy tạo vai trò khác để cấp quyền nghiệp vụ.",
    };
  try {
    await db.$transaction(async (tx) => {
      await lock(tx, session);
      const before = v.id
        ? await tx.vai_tro.findFirst({
            where: { id: v.id, company_id: session.companyId },
            include: { danh_sach_quyen: { include: { quyen: true } } },
          })
        : null;
      if (v.id && !before) throw Error("Không tìm thấy vai trò.");
      if (before && before.updated_at.toISOString() !== v.version)
        throw Error("Vai trò đã được thay đổi. Tải lại trang trước khi lưu.");
      if (before && before.ma_vai_tro !== v.code)
        throw Error("Mã vai trò không thể thay đổi.");
      const catalog = await tx.quyen.findMany();
      const editable = catalog.filter(
        (p) =>
          isEditableGrant(p) &&
          (p.phan_he !== "WORKFLOW" || v.workflowActions !== undefined),
      );
      const selected = Object.entries(v.permissions)
        .filter(([, level]) => level !== "NONE")
        .map(([module, level]) => {
          const p = editable.find(
            (p) => p.phan_he === module && p.hanh_dong === level,
          );
          if (!p)
            throw Error("Danh mục quyền chưa sẵn sàng. Kiểm tra migration.");
          return p.id;
        });
      for (const action of new Set(v.workflowActions ?? [])) {
        const p = editable.find(
          (p) => p.phan_he === "WORKFLOW" && p.hanh_dong === action,
        );
        if (!p) throw Error("Danh mục quyền quy trình chưa sẵn sàng.");
        selected.push(p.id);
      }
      const role = before
        ? await tx.vai_tro.update({
            where: { id: before.id },
            data: { ten_vai_tro: v.name, mo_ta: v.description },
          })
        : await tx.vai_tro.create({
            data: {
              ma_vai_tro: v.code,
              ten_vai_tro: v.name,
              mo_ta: v.description,
              company_id: session.companyId,
            },
          });
      // Preserve historical workflow/unsupported/scoped grants; never flatten them to MANAGE.
      await tx.vai_tro_quyen.deleteMany({
        where: {
          role_id: role.id,
          permission_id: { in: editable.map((p) => p.id) },
        },
      });
      await tx.vai_tro_quyen.createMany({
        data: selected.map((id) => ({
          role_id: role.id,
          permission_id: id,
        })),
      });
      await ensureAdministrator(tx, session.companyId);
      await audit(
        tx,
        session,
        before ? "PERMISSION_CHANGE" : "CREATE",
        role.id,
        role.ten_vai_tro,
        before
          ? {
              name: before.ten_vai_tro,
              description: before.mo_ta,
              permissionIds: before.danh_sach_quyen.map(
                (p) => p.permission_id,
              ),
            }
          : {},
        {
          name: v.name,
          description: v.description,
          permissions: v.permissions,
          workflowActions:
            v.workflowActions ??
            workflowActions(before?.danh_sach_quyen.map((p) => p.quyen) ?? []),
          retainedPermissionIds:
            before?.danh_sach_quyen
              .filter((p) => !isEditableGrant(p.quyen))
              .map((p) => p.permission_id) ?? [],
        },
      );
    });
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Đã lưu vai trò. Quyền áp dụng từ yêu cầu tiếp theo.",
    };
  } catch (e) {
    return { success: false, message: message(e) };
  }
}
export async function deleteRole(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "ROLES", "MANAGE"))
    return { success: false, message: "Không có quyền quản lý vai trò." };
  const parsed = RoleDeleteSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Vai trò không hợp lệ." };
  try {
    await db.$transaction(async (tx) => {
      await lock(tx, session);
      const role = await tx.vai_tro.findFirst({
        where: {
          id: parsed.data.id,
          company_id: session.companyId,
        },
        include: { _count: { select: { danh_sach_tai_khoan: true } } },
      });
      if (!role) throw Error("Không tìm thấy vai trò.");
      if (role.la_vai_tro_he_thong)
        throw Error("Không thể xóa vai trò hệ thống.");
      if (role._count.danh_sach_tai_khoan)
        throw Error("Gỡ vai trò khỏi các tài khoản trước khi xóa.");
      if (role.updated_at.toISOString() !== parsed.data.version)
        throw Error("Vai trò đã thay đổi. Vui lòng tải lại.");
      await tx.vai_tro.delete({ where: { id: role.id } });
      await ensureAdministrator(tx, session.companyId);
      await audit(
        tx,
        session,
        "DELETE",
        role.id,
        role.ten_vai_tro,
        { code: role.ma_vai_tro, name: role.ten_vai_tro },
        {},
      );
    });
    revalidatePath("/", "layout");
    return { success: true, message: "Đã xóa vai trò." };
  } catch (e) {
    return { success: false, message: message(e) };
  }
}
export async function assignAccountRoles(input: unknown) {
  const session = await getSession();
  if (!session || !hasPermission(session, "ROLES", "MANAGE"))
    return { success: false, message: "Không có quyền quản lý vai trò." };
  const parsed = RoleAssignmentSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "Dữ liệu gán vai trò không hợp lệ." };
  const v = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      await lock(tx, session);
      const account = await tx.tai_khoan.findFirst({
        where: { id: v.accountId, company_id: session.companyId },
        include: { danh_sach_vai_tro: true },
      });
      if (!account) throw Error("Không tìm thấy tài khoản.");
      if (account.updated_at.toISOString() !== v.version)
        throw Error("Tài khoản đã thay đổi. Tải lại trang trước khi lưu.");
      const ids = [...new Set(v.roleIds)];
      if (
        (await tx.vai_tro.count({
          where: {
            id: { in: ids },
            company_id: session.companyId,
          },
        })) !== ids.length
      )
        throw Error("Vai trò không hợp lệ.");
      await tx.tai_khoan_vai_tro.deleteMany({
        where: { account_id: account.id },
      });
      await tx.tai_khoan_vai_tro.createMany({
        data: ids.map((id, i) => ({
          account_id: account.id,
          role_id: id,
          la_vai_tro_chinh: i === 0,
        })),
      });
      // Session queries current permissions; no need to sign out when only role membership changes.
      await tx.tai_khoan.update({
        where: { id: account.id },
        data: { updated_at: new Date() },
      });
      await ensureAdministrator(tx, session.companyId);
      await audit(
        tx,
        session,
        "PERMISSION_CHANGE",
        account.id,
        account.ten_dang_nhap,
        {
          accountId: account.id,
          roleIds: account.danh_sach_vai_tro.map((r) => r.role_id),
        },
        { accountId: account.id, roleIds: ids },
      );
    });
    revalidatePath("/", "layout");
    return { success: true, message: "Đã cập nhật vai trò tài khoản." };
  } catch (e) {
    return { success: false, message: message(e) };
  }
}
