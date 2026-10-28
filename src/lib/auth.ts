import { verifySessionToken } from "@/lib/session-token";
export { createSessionToken, verifySessionToken } from "@/lib/session-token";
import { cookies } from "next/headers";

export type PermissionLevel = "NONE" | "VIEW" | "MANAGE";

export interface SessionUser {
  userId: number;
  employeeId?: number | null;
  sessionVersion?: number;
  username: string;
  fullName: string;
  employeeCode: string;
  position?: string | null;
  avatarUrl?: string | null;
  companyId: number;
  departmentId?: number | null;
  departmentName?: string | null;
  roleCodes: string[];
  permissions: Record<string, PermissionLevel>;
}

const COOKIE_NAME = "sdg_session";
/**
 * Lấy Session người dùng hiện tại từ Cookie (dùng trong Server Components / Server Actions)
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const tokenUser = await verifySessionToken(token);
    if (!tokenUser || !Number.isInteger(tokenUser.userId)) return null;
    const { readAccountSession } = await import("@/lib/account-session");
    const current = await readAccountSession(tokenUser.userId);
    if (!current || current.companyId !== tokenUser.companyId || current.sessionVersion !== (tokenUser.sessionVersion ?? 0)) return null;
    return current;
  } catch {
    return null;
  }
}

/**
 * Gán cookie Session an toàn cho Client
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 ngày
  });
}

/**
 * Xóa cookie Session khi Đăng xuất
 */
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Helper kiểm tra cấp độ quyền trực tiếp từ Session (0ms, không query DB)
 */
export function hasPermission(
  session: SessionUser | null | undefined,
  module: string,
  level: "VIEW" | "MANAGE" = "VIEW"
): boolean {
  if (!session?.permissions) return false;
  const userLevel = session.permissions[module];
  if (!userLevel || userLevel === "NONE") return false;
  if (level === "VIEW") return userLevel === "VIEW" || userLevel === "MANAGE";
  if (level === "MANAGE") return userLevel === "MANAGE";
  return false;
}
