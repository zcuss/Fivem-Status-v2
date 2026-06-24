import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const callbackUrl = process.env.DISCORD_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return NextResponse.json(
      { error: "Discord OAuth not configured" },
      { status: 500 }
    );
  }

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
