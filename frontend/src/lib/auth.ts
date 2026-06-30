import { cookies } from "next/headers";
import crypto from "crypto";
import type { SessionData, DiscordGuild } from "./types";
import { createSession, getSessionById, deleteSession } from "./session-store";
export type { SessionData, DiscordGuild };

// ============================================================
// Constants
// ============================================================

const SESSION_COOKIE = "fivem_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEV_DISCORD_IDS = (process.env.DEV_DISCORD_IDS || "")
  .split(",")
  .filter(Boolean);

// ============================================================
// Server-side session API (file-based, like old Express-session)
// ============================================================

/**
 * Read session from server-side store via session_id cookie.
 * Cookie is tiny (UUID ~32 chars). All data lives on disk.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSessionById(sessionId);
}

/**
 * Create server-side session, return Set-Cookie header value.
 * Cookie holds only session_id — tiny, always under 4KB.
 */
export function setSessionCookie(session: SessionData): string {
  const sessionId = createSession(session);
  if (!sessionId) return "";
  return [
    `${SESSION_COOKIE}=${sessionId}`,
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
 * Clear session (delete from store + clear cookie).
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`;
}

// ============================================================
// Auth helpers
// ============================================================

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not authenticated");
  }
  return session;
}

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

export function resolveRole(
  discordId: string,
  guilds: DiscordGuild[]
): "user" | "admin" | "dev" {
  if (DEV_DISCORD_IDS.includes(discordId)) return "dev";
  for (const guild of guilds) {
    if (guild.owner) return "admin";
    if (guild.permissions & ADMIN_PERMISSION) return "admin";
  }
  return "user";
}

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
