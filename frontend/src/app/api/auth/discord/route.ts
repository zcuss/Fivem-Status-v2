import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Discord OAuth not configured" },
      { status: 500 }
    );
  }

  // Derive callback URL from request Host header (matches user's domain)
  const host = req.headers.get("host") || "test.finder.zcus.dev";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const callbackUrl = `${protocol}://${host}/api/auth/callback`;

  // Generate CSRF state
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "identify guilds",
    state,
  });

  const res = NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );

  // Store state in cookie for CSRF verification
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return res;
}
