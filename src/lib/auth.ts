import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type PermissionLevel = "NONE" | "VIEW" | "MANAGE";

export interface SessionUser {
  userId: number;
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
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "sdg_erp_super_secret_jwt_key_default_2026"
);

/**
 * Tạo JWT Session Token từ thông tin người dùng
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

/**
 * Xác thực chuỗi Token và trả về thông tin Session (Edge & Node compatible)
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Lấy Session người dùng hiện tại từ Cookie (dùng trong Server Components / Server Actions)
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
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
