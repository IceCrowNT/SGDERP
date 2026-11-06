import { SignJWT, jwtVerify } from "jose";
import type { SessionUser } from "@/lib/auth";

function secretKey() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw new Error("SESSION_SECRET phải được cấu hình ít nhất 32 ký tự.");
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

/**
 * Tạo JWT Session Token từ thông tin người dùng
 */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/**
 * Xác thực chuỗi Token và trả về thông tin Session (Edge & Node compatible)
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
