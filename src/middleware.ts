import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session-token";
import { assetPath, assetReturnPath, parseAssetId } from "@/lib/asset-link";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("sdg_session")?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const assetId = request.nextUrl.pathname === "/assets" ? parseAssetId(request.nextUrl.searchParams.get("asset")) : null;
  const returnTo = assetId !== null ? assetPath(assetId)
    : request.nextUrl.pathname === "/profile" ? assetReturnPath(request.nextUrl.searchParams.get("returnTo")) : null;

  let isAuthenticated = false;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.userId) {
      isAuthenticated = true;
      if (session.mustChangePassword && !isLoginPage && !request.nextUrl.pathname.startsWith("/profile") && !request.nextUrl.pathname.startsWith("/media/avatar/")) {
        const profileUrl = new URL("/profile", request.url);
        if (returnTo) profileUrl.searchParams.set("returnTo", returnTo);
        return NextResponse.redirect(profileUrl);
      }
    }
  }

  // Chưa đăng nhập mà truy cập trang bảo vệ -> điều hướng về /login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
