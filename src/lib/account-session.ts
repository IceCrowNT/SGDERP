import { db } from "@/lib/db";
import type { PermissionLevel, SessionUser } from "@/lib/auth";

// Identity and permissions come from the selected account, never from sibling accounts.
export async function readAccountSession(
  userId: number,
): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      employee: { include: { department: true } },
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!user?.isActive) return null;
  const roleCodes = user.roles
    .filter((r) => r.role.companyId === user.companyId)
    .map((r) => r.role.code);
  const permissions: Record<string, PermissionLevel> = {
    HR: "NONE",
    SYSTEM: "NONE",
    TASK: "NONE",
    APPROVAL: "NONE",
  };
  if (roleCodes.includes("ADMIN") || roleCodes.includes("IT_ADMIN")) {
    for (const mod of Object.keys(permissions)) permissions[mod] = "MANAGE";
  } else {
    for (const { role } of user.roles) {
      if (role.companyId !== user.companyId) continue;
      for (const { permission: p } of role.permissions) {
        if (p.action === "MANAGE") permissions[p.module] = "MANAGE";
        else if (p.action === "VIEW" && permissions[p.module] !== "MANAGE")
          permissions[p.module] = "VIEW";
      }
    }
  }
  return {
    userId: user.id,
    username: user.username,
    fullName: user.employee?.fullName ?? user.displayName,
    employeeId: user.employeeId,
    employeeCode: user.employee?.employeeCode ?? "",
    position: user.employee?.position,
    avatarUrl: user.employee?.avatarUrl,
    companyId: user.companyId,
    departmentId: user.employee?.departmentId,
    departmentName: user.employee?.department?.name,
    roleCodes,
    permissions,
    sessionVersion: user.sessionVersion,
  };
}
