import { NextRequest, NextResponse } from "next/server";
import { resolveRole, upsertUserRole, setSessionCookie } from "@/lib/auth";
import type { SessionData, DiscordGuild } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCORD_API = "https://discord.com/api/v10";

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

interface DiscordMember {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Derive base URL from request Host header
  const host = req.headers.get("host") || "test.finder.zcus.dev";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  const callbackUrl = `${baseUrl}/api/auth/callback`;

  // Validate
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", baseUrl));
  }

  // CSRF check
  const savedState = req.cookies.get("oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/?error=invalid_state", baseUrl));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?error=oauth_not_configured", baseUrl)
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[AUTH] Token exchange failed:", tokenRes.status, errBody);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", baseUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user info + guilds in parallel
    const [userRes, guildsRes] = await Promise.all([
      fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/?error=user_fetch_failed", baseUrl));
    }

    const user: DiscordUser = await userRes.json();
    const guilds: DiscordMember[] = guildsRes.ok ? await guildsRes.json() : [];

    // Map guilds to session format
    const sessionGuilds: DiscordGuild[] = guilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
    }));

    // Resolve role
    const role = resolveRole(user.id, sessionGuilds);

    // Upsert user_roles
    await upsertUserRole(user.id, user.username, user.global_name, role);

    // Build session — server-side store, size doesn't matter anymore
    const session: SessionData = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      globalName: user.global_name,
      guilds: sessionGuilds,
      role,
      iat: Date.now(),
    };

    // Create server-side session, get Set-Cookie header
    const cookieHeader = setSessionCookie(session);
    if (!cookieHeader) {
      return NextResponse.redirect(new URL("/?error=session_failed", baseUrl));
    }

    // 307 redirect to dashboard with session cookie
    const response = NextResponse.redirect(new URL("/dashboard", baseUrl), 307);
    response.headers.append("Set-Cookie", cookieHeader);
    response.headers.append("Set-Cookie", "oauth_state=; Path=/; Max-Age=0");
    return response;
  } catch (err) {
    console.error("[AUTH] Discord OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=callback_exception", baseUrl));
  }
}
