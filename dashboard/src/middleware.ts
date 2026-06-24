import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ============================================================
// Middleware — lightweight cookie validation only.
// Full session decode happens in lib/auth.ts (server components).
// ============================================================

const SESSION_COOKIE = "fivem_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function sign(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  return hmac.digest("hex");
}

function verifySessionCookie(
  cookie: string,
  secret: string
): { valid: boolean; payload?: any } {
  const [base64, signature] = cookie.split(".");
  if (!base64 || !signature) return { valid: false };

  try {
    const expected = sign(base64, secret);
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return { valid: false };
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { valid: false };

    const json = Buffer.from(base64, "base64url").toString("utf-8");
    const payload = JSON.parse(json);

    if (Date.now() - payload.iat > SESSION_MAX_AGE_MS) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

// Public routes that don't require auth
const PUBLIC_PATHS = [
  "/",
  "/api/auth/discord",
  "/api/auth/callback",
  "/api/auth/logout",
];

// Protected route prefixes
const PROTECTED_PREFIXES = ["/dashboard", "/bots", "/servers", "/logs"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-protected routes
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/?error=no_secret", req.url));
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const { valid, payload } = verifySessionCookie(cookie, secret);
  if (!valid || !payload?.userId) {
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  // Forward user info to downstream handlers via headers
  const headers = new Headers(req.headers);
  headers.set("X-User-Id", payload.userId);
  headers.set("X-User-Role", payload.role || "user");

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/dashboard/:path*", "/bots/:path*", "/servers/:path*", "/logs/:path*"],
};
