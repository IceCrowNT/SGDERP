"use server";

import * as bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSessionToken,
  setSessionCookie,
  deleteSessionCookie,
  getSession,
} from "@/lib/auth";
import { LoginSchema, LoginInput } from "@/lib/validations/auth";
import { readAccountSession } from "@/lib/account-session";
import { logActivity } from "@/lib/audit";

export async function loginAction(formData: FormData | LoginInput) {
  try {
    const rawData =
      formData instanceof FormData
        ? {
            username: formData.get("username"),
            password: formData.get("password"),
          }
        : formData;

    const parsed = LoginSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Thông tin đăng nhập không hợp lệ.",
      };
    }

    const cleanUsername = parsed.data.username.trim().toLowerCase();
    const cleanPassword = parsed.data.password;

    // Username identifies one account; employee code can belong to several accounts.
    const user = await db.user.findUnique({ where: { username: cleanUsername } });

    if (!user) {
      await logActivity({
        username: cleanUsername,
        action: "LOGIN_FAILED",
        module: "AUTH",
        description: `Đăng nhập thất bại: Tài khoản "${cleanUsername}" không tồn tại.`,
      });
      return {
        success: false,
        error: "Tài khoản hoặc mật khẩu không chính xác.",
      };
    }

    if (!user.isActive) {
      await logActivity({
        userId: user.id,
        username: user.username,
        fullName: user.displayName,
        companyId: user.companyId,
        action: "LOGIN_FAILED",
        module: "AUTH",
        targetId: String(user.id),
        targetName: user.displayName,
        description: `Đăng nhập thất bại: Tài khoản "${user.username}" đang bị khoá.`,
      });
      return {
        success: false,
        error: "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.",
      };
    }

    // So khớp mật khẩu đã băm bằng bcryptjs
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    if (!isPasswordValid) {
      await logActivity({
        userId: user.id,
        username: user.username,
        fullName: user.displayName,
        companyId: user.companyId,
        action: "LOGIN_FAILED",
        module: "AUTH",
        targetId: String(user.id),
        targetName: user.displayName,
        description: `Đăng nhập thất bại: Sai mật khẩu cho tài khoản "${user.username}".`,
      });
      return {
        success: false,
        error: "Tài khoản hoặc mật khẩu không chính xác.",
      };
    }

    const sessionPayload = await readAccountSession(user.id);
    if (!sessionPayload) return { success: false, error: "Tài khoản không còn hoạt động." };

    // Tạo JWT token và lưu vào HttpOnly Cookie
    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Ghi nhật ký Đăng nhập thành công
    await logActivity({
      userId: user.id,
      username: user.username,
      fullName: user.displayName,
      companyId: user.companyId,
      action: "LOGIN",
      module: "AUTH",
      targetId: String(user.id),
      targetName: user.displayName,
      description: `Đăng nhập thành công vào hệ thống (Chức vụ: ${sessionPayload.position || "Cán bộ nhân viên"})`,
    });

    return { success: true };
  } catch (error) {
    console.error("Lỗi khi đăng nhập:", error);
    return {
      success: false,
      error: "Đã xảy ra lỗi trong quá trình xử lý đăng nhập.",
    };
  }
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await logActivity({
      userId: session.userId,
      username: session.username,
      fullName: session.fullName,
      companyId: session.companyId,
      action: "LOGOUT",
      module: "AUTH",
      targetId: String(session.userId),
      targetName: session.fullName,
      description: "Đăng xuất an toàn khỏi hệ thống",
    });
  }

  await deleteSessionCookie();
  redirect("/login");
}
