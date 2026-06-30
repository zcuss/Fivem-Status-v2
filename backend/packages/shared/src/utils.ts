// ============================================================
// Shared utilities for Fivem-Status v2
// ============================================================

const WIB_OFFSET = 7 * 60 * 60 * 1000; // UTC+7

/** Current time in WIB (Asia/Jakarta) */
export function nowWIB(): Date {
  return new Date(Date.now() + WIB_OFFSET);
}

/** Today's date string YYYY-MM-DD in WIB */
export function playDateWIB(resetHour = 5, resetMinute = 59): string {
  const now = new Date(Date.now() + WIB_OFFSET - (resetHour * 3600 + resetMinute * 60) * 1000);
  return formatDateYmd(now);
}

export function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Format seconds to HH:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Normalize player name for consistent DB lookups */
export function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Normalize search string for fuzzy matching */
export function normalizeSearch(str: string): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize server code (strip whitespace, lowercase) */
export function normalizeServerCode(code: string): string {
  return String(code || "").trim().toLowerCase();
}

/** Parse comma-separated Discord ID list */
export function parseDiscordIdList(value: string | undefined): number[] {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d{5,20}$/.test(id))
    .map(Number);
}

/** First non-empty string from candidates */
export function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** Safe integer parse with fallback */
export function parseInteger(value: string | undefined, fallback: number, min?: number, max?: number): number {
  const n = parseInt(String(value || ""), 10);
  if (!Number.isFinite(n)) return fallback;
  let result = n;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

/** Safe boolean parse */
export function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

/** Chunk array into batches */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ============================================================
// Table formatting (for find/spy/refresh embeds)
// ============================================================

interface PlayerRow {
  id: number;
  name: string;
  ping?: number;
  time?: string;
}

/** Calculate column widths for aligned table output */
export function calcWidths(rows: PlayerRow[]): { idW: number; nameW: number; timeW: number } {
  const idW = Math.max(...rows.map((r) => String(r.id).length), 4);
  const nameW = Math.max(...rows.map((r) => r.name.length), 4);
  const timeW = Math.max(...rows.map((r) => (r.time || "").length), 8);
  return { idW, nameW, timeW };
}

/** Format a single player line aligned: [ID] name      HH:MM:SS */
export function formatPlayerLine(r: PlayerRow, widths: { idW: number; nameW: number; timeW: number }): string {
  const id = String(r.id).padStart(widths.idW);
  const name = r.name.padEnd(widths.nameW);
  const time = (r.time || "").padEnd(widths.timeW);
  return `[${id}] ${name} ${time}`;
}

/** Format WIB timestamp for footer: DD/MM/YYYY, HH.MM.ss WIB */
export function formatFooterTimeWIB(): string {
  const now = nowWIB();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}.${mi}.${ss} WIB`;
}

/** Get author name from env */
export const AUTHOR_NAME = process.env.AUTHOR || "Zcus";
/** Bot refresh interval in ms */
export const INTERVAL = Number(process.env.BOT_INTERVAL_MS) || 10000;
