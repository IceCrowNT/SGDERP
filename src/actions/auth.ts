"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function loginAction(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" };
  }

  // 1. Kiểm tra tài khoản admin mặc định
  if (username === "admin" && password === "123456") {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", "admin_authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    return { success: true };
  }

  // 2. Kiểm tra tài khoản trong cơ sở dữ liệu
  try {
    const user = await db.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const cookieStore = await cookies();
        cookieStore.set(
          "auth_token",
          JSON.stringify({
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            companyId: user.companyId,
            departmentId: user.departmentId,
            roles: user.roles.map((r) => r.role.code),
          }),
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
          }
        );
        return { success: true };
      }
    }
  } catch (error) {
    console.error("Lỗi xác thực người dùng:", error);
  }

  return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}
