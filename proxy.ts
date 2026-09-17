import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isStaff } from "@/lib/auth/access";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET
  });

  if (token && isStaff(token.role)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return NextResponse.json(
      {
        success: false,
        error: { code: token ? "FORBIDDEN" : "UNAUTHORIZED", message: "Bạn cần đăng nhập tài khoản BTC." }
      },
      { status: token ? 403 : 401 }
    );
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
