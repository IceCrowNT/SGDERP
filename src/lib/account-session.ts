import { db } from "@/lib/db";
import { permissionLevels, workflowActions } from "@/lib/role-catalog";
import type { SessionUser } from "@/lib/auth";

// Identity and permissions come from the selected account, never from sibling accounts.
export async function readAccountSession(
  userId: number,
): Promise<SessionUser | null> {
  const user = await db.tai_khoan.findUnique({
    where: { id: userId },
    include: {
      nhan_su: { include: { phong_ban: true } },
      danh_sach_vai_tro: {
        include: {
          vai_tro: {
            include: { danh_sach_quyen: { include: { quyen: true } } },
          },
        },
      },
    },
  });
  if (!user?.cho_phep_dang_nhap || user.nhan_su?.tinh_trang_lam_viec === "LEFT")
    return null;
  const roleCodes = user.danh_sach_vai_tro
    .filter((r) => r.vai_tro.company_id === user.company_id)
    .map((r) => r.vai_tro.ma_vai_tro);
  const permissions = permissionLevels(
    user.danh_sach_vai_tro
      .filter((r) => r.vai_tro.company_id === user.company_id)
      .flatMap((r) => r.vai_tro.danh_sach_quyen.map((p) => p.quyen)),
  );
  return {
    mustChangePassword: user.bat_buoc_doi_mat_khau,
    userId: user.id,
    username: user.ten_dang_nhap,
    fullName: user.nhan_su?.ho_ten ?? user.ten_hien_thi,
    employeeId: user.employee_id,
    employeeCode: user.nhan_su?.ma_nhan_su ?? "",
    position: user.nhan_su?.chuc_vu,
    avatarUrl: user.nhan_su?.duong_dan_anh_dai_dien,
    companyId: user.company_id,
    departmentId: user.nhan_su?.department_id,
    departmentName: user.nhan_su?.phong_ban?.ten_phong_ban,
    roleCodes,
    permissions,
    workflowActions: workflowActions(
      user.danh_sach_vai_tro
        .filter((r) => r.vai_tro.company_id === user.company_id)
        .flatMap((r) => r.vai_tro.danh_sach_quyen.map((p) => p.quyen)),
    ),
    sessionVersion: user.phien_ban_dang_nhap,
  };
}
