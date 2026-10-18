import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("sdg_session")?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  let isAuthenticated = false;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.userId) {
      isAuthenticated = true;
    }
  }

  // Chưa đăng nhập mà truy cập trang bảo vệ -> điều hướng về /login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Đã đăng nhập mà truy cập lại trang /login -> điều hướng về trang chủ
  if (isAuthenticated && isLoginPage) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
