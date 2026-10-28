import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/lib/auth";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "sdg_erp_super_secret_jwt_key_default_2026",
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
export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
