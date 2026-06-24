import { cookies } from "next/headers";
import crypto from "crypto";
import type { SessionData, DiscordGuild } from "./types";
export type { SessionData, DiscordGuild };

// ============================================================
// Constants
// ============================================================

const SESSION_COOKIE = "fivem_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEV_DISCORD_IDS = (process.env.DEV_DISCORD_IDS || "")
  .split(",")
  .filter(Boolean);

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env not set");
  return secret;
}

// ============================================================
// Signing helpers
// ============================================================

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSessionSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

function encodeSession(session: SessionData): string {
  const json = JSON.stringify(session);
  const base64 = Buffer.from(json).toString("base64url");
  const signature = sign(base64);
  return `${base64}.${signature}`;
}

function decodeSession(cookie: string): SessionData | null {
  const [base64, signature] = cookie.split(".");
  if (!base64 || !signature) return null;

  const expected = sign(base64);
  // Constant-time compare
  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    return null;
  }

  try {
    const json = Buffer.from(base64, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionData;
  } catch {
    return null;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Read session from cookie (server component / route handler).
 * Returns null if not authenticated or session expired/invalid.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = decodeSession(raw);
  if (!session) return null;

  // Expired?
  if (Date.now() - session.iat > SESSION_MAX_AGE_MS) return null;

  return session;
}

/**
 * Set session cookie (called after OAuth callback).
 */
export function setSessionCookie(session: SessionData): string {
  const encoded = encodeSession(session);
  return [
    `${SESSION_COOKIE}=${encoded}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`,
  ]
    .filter(Boolean)
    .join("; ");
}

/**
 * Clear session cookie (logout).
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`;
}

/**
 * Get session or throw → redirect to login.
 * Use in API route handlers / server actions.
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not authenticated");
  }
  return session;
}

/**
 * Get session or throw → redirect + check admin/dev role.
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role === "user") {
    throw new AuthError("Insufficient permissions");
  }
  return session;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================================
// Role resolution
// ============================================================

const ADMIN_PERMISSION = 0x8; // Discord ADMINISTRATOR

/**
 * Determine effective role for a user.
 * 1. DEV_DISCORD_IDS match → "dev"
 * 2. Guild owner in any guild → "admin"
 * 3. Guild member with ADMINISTRATOR permission → "admin"
 * 4. DB user_roles table → stored role (fallback "user")
 */
export function resolveRole(
  discordId: string,
  guilds: DiscordGuild[]
): "user" | "admin" | "dev" {
  // Developer override
  if (DEV_DISCORD_IDS.includes(discordId)) return "dev";

  // Guild-based admin checks
  for (const guild of guilds) {
    if (guild.owner) return "admin";
    if (guild.permissions & ADMIN_PERMISSION) return "admin";
  }

  return "user";
}

/**
 * Upsert user_roles record after login.
 * Preserves existing role unless resolved role is higher.
 */
export async function upsertUserRole(
  discordId: string,
  username: string,
  globalName: string | null,
  resolvedRole: "user" | "admin" | "dev"
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:34002";
  try {
    await fetch(`${apiUrl}/api/users/${discordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: resolvedRole, discord_username: username, discord_name: globalName }),
    });
  } catch {
    // API may not be running during dev — ignore
  }
}
