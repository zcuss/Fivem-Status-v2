// ============================================================
// Playtime Tracking Service
// Tracks player time per server per day (hot → archive)
// Ported from ~/Fivem-Status/src/services.ts
// ============================================================

import { db } from "@fivem/db";
import {
  normalizeName,
  playDateWIB,
  nowWIB,
  normalizeServerCode,
  formatDateYmd,
  chunk,
} from "@fivem/shared";
import {
  PLAYTIME_TICK_SECONDS,
  PLAYTIME_HOT_DAYS,
  PLAYTIME_ARCHIVE_CHUNK,
} from "@fivem/shared";

let archiveRunning = false;
let lastArchiveCheckAt = 0;
const PLAYTIME_ARCHIVE_CHECK_MS = Math.max(
  60_000,
  parseInt(String(process.env.PLAYTIME_ARCHIVE_CHECK_MS || "900000"), 10) || 900000
);

// ============================================================
// Helper: execute with retry for lock contention
// ============================================================

async function executeWithRetry(sql: string, params: any[] = [], retries = 3): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      const [rows] = await db.execute(sql, params);
      return [rows];
    } catch (err: any) {
      const code = err?.code;
      const retryable =
        code === "ER_LOCK_WAIT_TIMEOUT" ||
        code === "ER_LOCK_DEADLOCK" ||
        code === "57P01" || // admin_shutdown
        code === "40001";  // serialization_failure
      if (!retryable || attempt >= retries) throw err;
      const delay = 50 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
}

// ============================================================
// Normalize server key
// ============================================================

function normalizeServerKey(value: string): string {
  return normalizeServerCode(value);
}

// ============================================================
// Get today's playtime by player keys
// ============================================================

export async function getTodayPlaytimeByKeys(
  serverKey: string,
  playerKeys: string[] = [],
  playDate: string = playDateWIB()
): Promise<Map<string, number>> {
  const normalizedServerKey = normalizeServerKey(serverKey);
  const keys = Array.from(
    new Set(playerKeys.map((v) => String(v || "").trim()).filter(Boolean))
  );
  const result = new Map<string, number>();
  if (!normalizedServerKey || !keys.length) return result;

  const chunks = chunk(keys, 500);
  for (const chunkKeys of chunks) {
    const placeholders = chunkKeys.map((_, i) => `$${i + 3}`).join(", ");
    const [rows] = await executeWithRetry(
      `SELECT p.player_key, h.playtime_seconds
       FROM playtime_daily_hot h
       JOIN playtime_players p ON p.id = h.player_ref
       WHERE h.server_key=$1 AND h.play_date=$2 AND p.player_key IN (${placeholders})`,
      [normalizedServerKey, playDate, ...chunkKeys]
    );
    for (const row of rows as any[]) {
      result.set(String(row.player_key || ""), Number(row.playtime_seconds) || 0);
    }
  }

  return result;
}

// ============================================================
// Upsert player dimension (playtime_players table)
// ============================================================

async function upsertPlayerDimension(rows: Array<{ key: string; name: string; id: any }>, now: string): Promise<Map<string, number>> {
  if (!rows.length) return new Map();

  const chunks = chunk(rows, 500);
  for (const chunkRows of chunks) {
    const values = chunkRows.map((_, i) => {
      const base = i * 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(", ");
    const params: any[] = [];
    for (const row of chunkRows) {
      params.push(row.key, row.name, row.id, now);
    }
    try {
      await executeWithRetry(
        `INSERT INTO playtime_players
         (player_key, latest_name, latest_player_id, updated_at)
         VALUES ${values}
         ON CONFLICT (player_key) DO UPDATE SET
           latest_name = EXCLUDED.latest_name,
           latest_player_id = EXCLUDED.latest_player_id,
           updated_at = EXCLUDED.updated_at`,
        params
      );
    } catch {
      // player_key might not have unique constraint — fallback to plain insert
      await executeWithRetry(
        `INSERT INTO playtime_players
         (player_key, latest_name, latest_player_id, updated_at)
         VALUES ${values}`,
        params
      );
    }
  }

  // Resolve player_key → id mapping
  const keyToRef = new Map<string, number>();
  const allKeys = rows.map((row) => row.key);
  const chunks2 = chunk(allKeys, 500);
  for (const chunkKeys of chunks2) {
    const placeholders = chunkKeys.map((_, i) => `$${i + 1}`).join(", ");
    const [resolved] = await executeWithRetry(
      `SELECT id, player_key FROM playtime_players WHERE player_key IN (${placeholders})`,
      chunkKeys
    );
    for (const row of resolved as any[]) {
      keyToRef.set(String(row.player_key || ""), Number(row.id));
    }
  }

  return keyToRef;
}

// ============================================================
// Main: update playtime for a server tick
// ============================================================

export async function updatePlaytime(
  players: any[],
  serverKey: string
): Promise<{ updated: number; playtimeMap: Map<string, number> }> {
  if (!players.length) return { updated: 0, playtimeMap: new Map() };

  const normalizedServerKey = normalizeServerKey(serverKey);
  if (!normalizedServerKey) return { updated: 0, playtimeMap: new Map() };

  const playDate = playDateWIB(5, 59);
  const now = nowWIB().toISOString();
  let updated = 0;
  const nextPlaytimeMap = new Map<string, number>();

  // Normalize & dedupe players
  const normalizedRaw = players.map((p) => {
    const rawName = String(p.name || "");
    const name = rawName.slice(0, 128);
    return { id: p.id, name, key: normalizeName(name) };
  });

  const deduped = new Map<string, typeof normalizedRaw[0]>();
  for (const row of normalizedRaw) {
    deduped.set(row.key, row);
  }
  const normalized = Array.from(deduped.values());
  if (!normalized.length) return { updated: 0, playtimeMap: new Map() };

  // Upsert dimension
  const keyToRef = await upsertPlayerDimension(normalized, now);
  const refs = Array.from(
    new Set(
      normalized
        .map((row) => keyToRef.get(row.key))
        .filter((value): value is number => Number.isFinite(value!) && (value as number) > 0)
    )
  );

  // Get existing playtime for today
  const existing = new Map<number, any>();
  const chunks3 = chunk(refs, 500);
  for (const chunkRefs of chunks3) {
    const placeholders = chunkRefs.map((_, i) => `$${i + 3}`).join(", ");
    const [rows] = await executeWithRetry(
      `SELECT player_ref, last_seen, playtime_seconds
       FROM playtime_daily_hot
       WHERE server_key=$1 AND play_date=$2 AND player_ref IN (${placeholders})`,
      [normalizedServerKey, playDate, ...chunkRefs]
    );
    for (const row of rows as any[]) {
      existing.set(Number(row.player_ref), row);
    }
  }

  // Build upserts
  const upserts: Array<{
    serverKey: string;
    playerRef: number;
    playDate: string;
    lastSeen: string;
    inc: number;
  }> = [];

  for (const p of normalized) {
    const playerRef = keyToRef.get(p.key);
    if (!Number.isFinite(playerRef) || (playerRef as number) <= 0) continue;
    const row = existing.get(playerRef as number);
    const currentSeconds = Number(row?.playtime_seconds) || 0;
    const inc = PLAYTIME_TICK_SECONDS;
    updated++;

    nextPlaytimeMap.set(p.key, currentSeconds + inc);
    upserts.push({
      serverKey: normalizedServerKey,
      playerRef: playerRef as number,
      playDate,
      lastSeen: now,
      inc,
    });
  }

  // Batch upsert hot playtime
  const chunks4 = chunk(upserts, 500);
  for (const chunkUpserts of chunks4) {
    const values = chunkUpserts.map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(", ");
    const params: any[] = [];
    for (const row of chunkUpserts) {
      params.push(row.serverKey, row.playerRef, row.playDate, row.lastSeen, row.inc);
    }
    await executeWithRetry(
      `INSERT INTO playtime_daily_hot
       (server_key, player_ref, play_date, last_seen, playtime_seconds)
       VALUES ${values}
       ON CONFLICT (server_key, player_ref, play_date) DO UPDATE SET
         playtime_seconds = playtime_daily_hot.playtime_seconds + EXCLUDED.playtime_seconds,
         last_seen = EXCLUDED.last_seen`,
      params
    );
  }

  return { updated, playtimeMap: nextPlaytimeMap };
}

// ============================================================
// Archive maintenance: move old hot data to archive
// ============================================================

export async function runPlaytimeArchiveMaintenance(): Promise<number> {
  const nowMs = Date.now();
  if (archiveRunning) return 0;
  if (nowMs - lastArchiveCheckAt < PLAYTIME_ARCHIVE_CHECK_MS) return 0;
  lastArchiveCheckAt = nowMs;

  const now = nowWIB();
  const today = formatDateYmd(now);
  const cutoffDate = new Date(now.getTime());
  cutoffDate.setDate(cutoffDate.getDate() - PLAYTIME_HOT_DAYS);
  const cutoff = formatDateYmd(cutoffDate);

  // Check if already ran today
  try {
    const [[state]]: any = await executeWithRetry(
      `SELECT setting_value FROM app_settings WHERE setting_key='playtime.archive.last_run_date' LIMIT 1`,
      []
    );
    if (String(state?.setting_value || "") === today) return 0;
  } catch {
    // Table might not exist, continue
  }

  archiveRunning = true;
  let totalMoved = 0;
  try {
    while (true) {
      const [picked]: any = await executeWithRetry(
        `SELECT server_key, player_ref, play_date, playtime_seconds, last_seen
         FROM playtime_daily_hot
         WHERE play_date < $1
         ORDER BY play_date ASC, server_key ASC
         LIMIT $2`,
        [cutoff, PLAYTIME_ARCHIVE_CHUNK]
      );

      if (!picked.length) break;

      for (const row of picked) {
        try {
          await executeWithRetry(
            `INSERT INTO playtime_daily_archive (server_key, player_ref, play_date, last_seen, playtime_seconds)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (server_key, player_ref, play_date) DO UPDATE SET
               playtime_seconds = GREATEST(playtime_daily_archive.playtime_seconds, EXCLUDED.playtime_seconds),
               last_seen = GREATEST(playtime_daily_archive.last_seen, EXCLUDED.last_seen)`,
            [row.server_key, row.player_ref, row.play_date, row.last_seen, row.playtime_seconds]
          );

          await executeWithRetry(
            `DELETE FROM playtime_daily_hot WHERE server_key=$1 AND player_ref=$2 AND play_date=$3`,
            [row.server_key, row.player_ref, row.play_date]
          );
          totalMoved++;
        } catch (err) {
          console.error("[PLAYTIME] archive row error:", err);
        }
      }

      if (picked.length < PLAYTIME_ARCHIVE_CHUNK) break;
    }

    // Mark as done today
    try {
      await executeWithRetry(
        `INSERT INTO app_settings (setting_key, setting_value)
         VALUES ('playtime.archive.last_run_date', $1)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
        [today]
      );
    } catch {}
  } finally {
    archiveRunning = false;
  }

  return totalMoved;
}
