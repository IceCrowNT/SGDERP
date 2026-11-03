import { db } from "@/lib/db";
import type { PermissionLevel, SessionUser } from "@/lib/auth";

// Identity and permissions come from the selected account, never from sibling accounts.
export async function readAccountSession(
  userId: number,
): Promise<SessionUser | null> {
  const user = await db.tai_khoan.findUnique({
    where: { dinh_danh: userId },
    include: {
      nhan_su: { include: { phong_ban: true } },
      danh_sach_vai_tro: {
        include: {
          vai_tro: { include: { danh_sach_quyen: { include: { quyen: true } } } },
        },
      },
    },
  });
  if (!user?.cho_phep_dang_nhap) return null;
  const roleCodes = user.danh_sach_vai_tro
    .filter((r) => r.vai_tro.dinh_danh_cong_ty === user.dinh_danh_cong_ty)
    .map((r) => r.vai_tro.ma_vai_tro);
  const permissions: Record<string, PermissionLevel> = {
    HR: "NONE",
    SYSTEM: "NONE",
    TASK: "NONE",
    APPROVAL: "NONE",
  };
  if (roleCodes.includes("ADMIN") || roleCodes.includes("IT_ADMIN")) {
    for (const mod of Object.keys(permissions)) permissions[mod] = "MANAGE";
  } else {
    for (const { vai_tro: role } of user.danh_sach_vai_tro) {
      if (role.dinh_danh_cong_ty !== user.dinh_danh_cong_ty) continue;
      for (const { quyen: p } of role.danh_sach_quyen) {
        if (p.hanh_dong === "MANAGE") permissions[p.phan_he] = "MANAGE";
        else if (p.hanh_dong === "VIEW" && permissions[p.phan_he] !== "MANAGE")
          permissions[p.phan_he] = "VIEW";
      }
    }
  }
  return {
    userId: user.dinh_danh,
    username: user.ten_dang_nhap,
    fullName: user.nhan_su?.ho_ten ?? user.ten_hien_thi,
    employeeId: user.dinh_danh_nhan_su,
    employeeCode: user.nhan_su?.ma_nhan_su ?? "",
    position: user.nhan_su?.chuc_vu,
    avatarUrl: user.nhan_su?.duong_dan_anh_dai_dien,
    companyId: user.dinh_danh_cong_ty,
    departmentId: user.nhan_su?.dinh_danh_phong_ban,
    departmentName: user.nhan_su?.phong_ban?.ten_phong_ban,
    roleCodes,
    permissions,
    sessionVersion: user.phien_ban_dang_nhap,
  };
}
