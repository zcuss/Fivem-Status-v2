import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { resolveRole, upsertUserRole } from "@/lib/auth";
import type { SessionData, DiscordGuild } from "@/lib/auth";

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

  // Validate
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  // CSRF check
  const savedState = req.cookies.get("oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/?error=invalid_state", req.url));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const callbackUrl = process.env.DISCORD_CALLBACK_URL;

  if (!clientId || !clientSecret || !callbackUrl) {
    return NextResponse.redirect(
      new URL("/?error=oauth_not_configured", req.url)
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
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
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
      return NextResponse.redirect(new URL("/?error=user_fetch_failed", req.url));
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

    // Build session
    const session: SessionData = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      globalName: user.global_name,
      guilds: sessionGuilds,
      role,
      iat: Date.now(),
    };

    const res = NextResponse.redirect(new URL("/dashboard", req.url));

    // Set session cookie using Next.js cookies API
    const encoded = (() => {
      const json = JSON.stringify(session);
      const b64 = Buffer.from(json).toString("base64url");
      const sig = createHmac("sha256", process.env.SESSION_SECRET || "").update(b64).digest("hex");
      return `${b64}.${sig}`;
    })();
    res.cookies.set("fivem_session", encoded, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: true,
    });

    // Clear OAuth state cookie
    res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });

    return res;
  } catch (err) {
    console.error("Discord OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=callback_exception", req.url));
  }
}
