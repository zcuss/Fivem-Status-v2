// ============================================================
// Shared constants for Fivem-Status v2
// ============================================================

export const CFX_API_BASE = "https://frontend.cfx-services.net/api/servers/single";

/** Server fetch cache TTL in ms */
export const SERVER_FETCH_TTL_MS = 3000;

/** Playtime tick interval in seconds (derived from BOT_INTERVAL_MS) */
export const PLAYTIME_TICK_SECONDS = 10;

/** Hot playtime retention days */
export const PLAYTIME_HOT_DAYS = 30;

/** Archive chunk size */
export const PLAYTIME_ARCHIVE_CHUNK = 5000;

/** Default auto-find limits by role */
export const AUTO_FIND_LIMITS: Record<string, number> = {
  user: 1,
  premium: 3,
  donator: 5,
  custom: 10,
};

/** Log retention hours */
export const LOG_RETENTION_HOURS = 12;
export const COMMAND_LOG_RETENTION_DAYS = 7;
export const COMMAND_USAGE_RETENTION_DAYS = 60;

/** Default user logo URL */
export const DEFAULT_USER_LOGO = process.env.DEFAULT_USER_LOGO || "";
