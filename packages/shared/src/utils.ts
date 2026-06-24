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

/** Normalize player name for consistent DB lookups */
export function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

/** Format seconds to human-readable duration */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Calculate column widths for aligned table output */
export function calcWidths(rows: string[], minWidth = 4): number[] {
  if (!rows.length) return [];
  const widths = rows.map((r) => r.length);
  const max = Math.max(...widths, minWidth);
  return widths.map(() => max);
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
