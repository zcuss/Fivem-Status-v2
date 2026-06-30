import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fivem_session";

const PUBLIC_PATHS = [
  "/",
  "/api/auth/discord",
  "/api/auth/callback",
  "/api/auth/logout",
];

const PROTECTED_PREFIXES = ["/dashboard", "/bots", "/servers", "/logs"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie || cookie.length < 10) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/bots/:path*", "/servers/:path*", "/logs/:path*"],
};
