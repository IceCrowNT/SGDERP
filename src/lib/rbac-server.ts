import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { permissionLevels } from "@/lib/role-catalog";

// Shared integrity helpers, all mutations remain direct Prisma transactions in actions.
export async function currentActor(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  module: string,
) {
  const account = await tx.tai_khoan.findFirst({
    where: { id: session.userId, company_id: session.companyId },
    include: {
      nhan_su: true,
      danh_sach_vai_tro: {
        include: {
          vai_tro: {
            include: { danh_sach_quyen: { include: { quyen: true } } },
          },
        },
      },
    },
  });
  const grants =
    account?.danh_sach_vai_tro
      .filter((r) => r.vai_tro.company_id === session.companyId)
      .flatMap((r) => r.vai_tro.danh_sach_quyen.map((p) => p.quyen)) ?? [];
  const permissions = permissionLevels(grants);
  if (
    !account?.cho_phep_dang_nhap ||
    account.bat_buoc_doi_mat_khau ||
    account.nhan_su?.tinh_trang_lam_viec === "LEFT" ||
    account.phien_ban_dang_nhap !== session.sessionVersion ||
    permissions[module] !== "MANAGE"
  )
    throw Error("Quyền truy cập đã thay đổi. Vui lòng tải lại trang.");
  return { permissions, grants };
}
export function administratorWhere(
  companyId: number,
): Prisma.tai_khoanWhereInput {
  return {
    company_id: companyId,
    cho_phep_dang_nhap: true,
    OR: [
      { employee_id: null },
      { nhan_su: { tinh_trang_lam_viec: { not: "LEFT" } } },
    ],
    AND: ["ACCOUNTS", "ROLES"].map((module) => ({
      danh_sach_vai_tro: {
        some: {
          vai_tro: {
            company_id: companyId,
            danh_sach_quyen: {
              some: {
                quyen: { phan_he: module, hanh_dong: "MANAGE", pham_vi: "ALL" },
              },
            },
          },
        },
      },
    })),
  };
}
export async function ensureAdministrator(
  tx: Prisma.TransactionClient,
  companyId: number,
) {
  if (!(await tx.tai_khoan.count({ where: administratorWhere(companyId) })))
    throw Error(
      "Phải giữ ít nhất một tài khoản quản trị hoạt động có quyền quản lý tài khoản và vai trò. Hãy bàn giao quyền quản trị trước.",
    );
}
export async function assertAssignableRoles(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  ids: number[],
  existingIds: number[] = [],
) {
  const actor = await currentActor(tx, session, "ACCOUNTS");
  const requested = [...new Set([...ids, ...existingIds])];
  const roles = await tx.vai_tro.findMany({
    where: {
      id: { in: requested },
      company_id: session.companyId,
    },
    include: { danh_sach_quyen: { include: { quyen: true } } },
  });
  if (roles.length !== requested.length) throw Error("Vai trò không hợp lệ.");
  if (actor.permissions.ROLES === "MANAGE") return;
  const canGrant = roles.every((r) =>
    r.danh_sach_quyen.every(({ quyen: p }) =>
      actor.grants.some(
        (g) =>
          g.phan_he === p.phan_he &&
          g.pham_vi === p.pham_vi &&
          (g.hanh_dong === p.hanh_dong ||
            (g.hanh_dong === "MANAGE" && p.hanh_dong === "VIEW")),
      ),
    ),
  );
  if (!canGrant)
    throw Error(
      "Không được cấp hoặc sửa tài khoản có quyền vượt quyền của bạn. Liên hệ người quản lý phân quyền.",
    );
}
