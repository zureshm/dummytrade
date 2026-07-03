import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("dummy_auth");

  if (!authCookie || authCookie.value !== "true") {
    return NextResponse.redirect(new URL("/dummy/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/trade/:path*"],
};
