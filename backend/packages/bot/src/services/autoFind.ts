// ============================================================
// AutoFind Service
// Monitors servers for keyword-matched players, updates embeds
// Ported from ~/Fivem-Status/src/bot.ts runAutoFind()
// ============================================================

import { Client, TextBasedChannel, EmbedBuilder } from "discord.js";
import { db } from "@fivem/db";
import {
  normalizeName,
  playDateWIB,
  calcWidths,
  formatPlayerLine,
  formatDuration,
  chunk,
} from "@fivem/shared";
import { DEFAULT_USER_LOGO, AUTHOR_NAME } from "@fivem/shared";
import { getSteamRanksByHexes } from "../commands/helpers.js";
import { getTodayPlaytimeByKeys } from "./playtime.js";

const AUTO_DISCORD_COOLDOWN_MS = Math.max(
  5_000,
  parseInt(String(process.env.AUTO_DISCORD_COOLDOWN_MS || "60000"), 10) || 60000
);

let autoFindDiscordBlockedUntil = 0;

// ============================================================
// Color cycling for embeds
// ============================================================

const COLOR_POOL = [
  "Blue", "Green", "Yellow", "Orange", "Red",
  "Purple", "Aqua", "Gold", "DarkBlue", "DarkGreen", "DarkPurple",
];
let colorIndex = 0;
function nextColor(): string {
  const color = COLOR_POOL[colorIndex];
  colorIndex = (colorIndex + 1) % COLOR_POOL.length;
  return color;
}

// ============================================================
// Discord error detection
// ============================================================

function isUnknownMessageError(err: any): boolean {
  return (
    Number(err?.code) === 10008 ||
    Number(err?.rawError?.code) === 10008
  );
}

function isDiscordNetworkError(err: any): boolean {
  const code = String(err?.code || "").toUpperCase();
  if (["ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return true;
  }
  const message = String(err?.message || "").toLowerCase();
  return (
    message.includes("getaddrinfo enotfound") ||
    message.includes("connect timeout") ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch")
  );
}

function isAutoFindDiscordCooldownActive(): boolean {
  return Date.now() < autoFindDiscordBlockedUntil;
}

function activateAutoFindDiscordCooldown(err: any): void {
  autoFindDiscordBlockedUntil = Date.now() + AUTO_DISCORD_COOLDOWN_MS;
  console.warn(
    `[AUTO] Pause AutoFind until ${new Date(autoFindDiscordBlockedUntil).toISOString()} due to ${String(err?.code || err?.message || err)}`
  );
}

// ============================================================
// Load enabled auto-find rows for given server keys
// ============================================================

export async function loadEnabledAutoFindRows(serverKeys: string[]): Promise<any[]> {
  const keys = Array.from(
    new Set(serverKeys.map((k) => String(k || "").toLowerCase()).filter(Boolean))
  );
  if (!keys.length) return [];

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  try {
    const [rows] = await db.execute(
      `SELECT * FROM auto_find WHERE enabled=1 AND server_key IN (${placeholders})`,
      keys
    );
    return rows as any[];
  } catch (err: any) {
    const isMissingColumn =
      err?.code === "42703" || // PG undefined_column
      (err?.code === "ER_BAD_FIELD_ERROR" && String(err?.sqlMessage || "").includes("enabled"));
    if (!isMissingColumn) throw err;
    const [rows] = await db.execute(
      `SELECT * FROM auto_find WHERE server_key IN (${placeholders})`,
      keys
    );
    return rows as any[];
  }
}

// ============================================================
// Logo patch cache (don't re-patch same auto row)
// ============================================================

const patchedAutoLogo = new Set<number>();

// ============================================================
// Main auto-find runner for a single server
// ============================================================

export async function runAutoFind(
  client: Client,
  players: any[],
  serverKey: string,
  autos: any[],
  playtimeMapInput?: Map<string, number> | null
): Promise<void> {
  if (!autos.length) return;
  if (isAutoFindDiscordCooldownActive()) return;

  const playDate = playDateWIB(5, 59);
  const steamHexSet = new Set<string>();

  // Prepare players with normalized names
  const preparedPlayers = players.map((p: any) => ({
    id: p.id,
    name: p.name,
    ping: p.ping,
    key: normalizeName(p.name),
    lowerName: String(p.name || "").toLowerCase(),
    steamHex: "",
    lowerSteamHex: "",
  }));

  // Batch lookup steam hexes
  if (preparedPlayers.length) {
    const keys = Array.from(new Set(preparedPlayers.map((p) => p.key)));
    const steamMap = new Map<string, string>();

    const chunks = chunk(keys, 500);
    for (const chunkKeys of chunks) {
      const placeholders = chunkKeys.map((_, i) => `$${i + 1}`).join(", ");
      const [steamRows]: any = await db.execute(
        `SELECT player_key, steam_hex, last_seen
         FROM steam_players
         WHERE player_key IN (${placeholders})
         ORDER BY last_seen DESC`,
        chunkKeys
      );
      for (const row of steamRows) {
        if (!steamMap.has(row.player_key)) {
          steamMap.set(row.player_key, String(row.steam_hex || "").toLowerCase());
        }
      }
    }

    for (const player of preparedPlayers) {
      const steamHex = steamMap.get(player.key) || "";
      player.steamHex = steamHex;
      player.lowerSteamHex = steamHex;
      if (steamHex) steamHexSet.add(steamHex);
    }
  }

  // Playtime map
  const playtimeMap = playtimeMapInput instanceof Map ? playtimeMapInput : new Map();
  if (!playtimeMap.size && preparedPlayers.length) {
    const keys = Array.from(new Set(preparedPlayers.map((p) => p.key)));
    const todayMap = await getTodayPlaytimeByKeys(serverKey, keys, playDate);
    for (const [key, seconds] of todayMap.entries()) {
      playtimeMap.set(key, seconds);
    }
  }

  // Match keywords per auto-find row
  const keywordMatchCache = new Map<string, any[]>();
  const ownerRankCache = new Map<string, Map<string, string>>();

  for (const auto of autos) {
    try {
      const keyword = String(auto.keyword || "").toLowerCase();
      const ownerId = String(auto.discord_id || "").trim();
      if (!ownerId) continue;

      // Get rank map for this owner
      let rankMap = ownerRankCache.get(ownerId);
      if (!rankMap) {
        rankMap = await getSteamRanksByHexes(Array.from(steamHexSet.values()), ownerId);
        ownerRankCache.set(ownerId, rankMap);
      }

      // Cache keyword matches
      const keywordCacheKey = `${ownerId}:${keyword}`;
      let foundPlayers = keywordMatchCache.get(keywordCacheKey);
      if (!foundPlayers) {
        foundPlayers = preparedPlayers.filter((p) => {
          if (p.lowerName.includes(keyword) || p.lowerSteamHex.includes(keyword)) return true;
          const rank = String(rankMap!.get(String(p.steamHex || "").toLowerCase()) || "");
          return rank.includes(keyword);
        });
        keywordMatchCache.set(keywordCacheKey, foundPlayers);
      }

      // Build table
      let rows: any[] = [];
      let table = "Tidak ada player online";

      if (foundPlayers.length) {
        rows = foundPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          ping: p.ping,
          time: formatDuration(playtimeMap.get(p.key) || 0),
        }));

        const widths = calcWidths(rows);
        table = rows.map((r) => formatPlayerLine(r, widths)).join("\n");
      }

      // Build embed using makeRefreshEmbed
      const embed = buildAutoFindEmbed({
        logo: auto.logo || DEFAULT_USER_LOGO || "❓",
        keyword: auto.keyword,
        server: serverKey,
        table,
        found: rows.length,
        max: preparedPlayers.length,
        color: auto.color || nextColor(),
      });

      // Patch default logo if missing
      if (!auto.logo && DEFAULT_USER_LOGO && !patchedAutoLogo.has(auto.id)) {
        patchedAutoLogo.add(auto.id);
        db.execute(`UPDATE auto_find SET logo=$1 WHERE id=$2`, [
          DEFAULT_USER_LOGO,
          auto.id,
        ]).catch(() => {
          patchedAutoLogo.delete(auto.id);
        });
      }

      // Send or update message
      const channel = client.channels.cache.get(auto.channel_id) ||
        (await client.channels.fetch(auto.channel_id).catch(() => null));

      if (!channel || !(channel as TextBasedChannel).isTextBased()) continue;

      if (auto.message_id) {
        try {
          const msg = await (channel as any).messages.fetch(auto.message_id).catch(() => null);
          if (msg) {
            await msg.edit({ content: "", embeds: [embed] });
            continue;
          }
        } catch (err) {
          // 10008 = unknown message, 50005 = not our message (can't edit)
          if (!isUnknownMessageError(err) && Number(err?.code) !== 50005) throw err;
          console.warn(
            `[AUTO] message not found/not ours, recreate id=${auto.id} ch=${auto.channel_id} msg=${auto.message_id}`
          );
        }
      }

      const sent = await (channel as any).send({ embeds: [embed] });
      await db.execute(`UPDATE auto_find SET message_id=$1 WHERE id=$2`, [sent.id, auto.id]);
    } catch (err: any) {
      if (isDiscordNetworkError(err)) {
        activateAutoFindDiscordCooldown(err);
        return;
      }
      console.error(
        `[AUTO] runAutoFind failed id=${auto?.id} server=${serverKey} keyword=${auto?.keyword || ""}:`,
        err
      );
    }
  }
}

// ============================================================
// Build auto-find embed (matches reference format)
// ============================================================

function buildAutoFindEmbed(opts: {
  logo?: string;
  keyword: string;
  server: string;
  table: string;
  found: number;
  max: number;
  color?: string;
}) {
  const colorHex = resolveColor(opts.color || "Blue");

  return new EmbedBuilder()
    .setTitle(`AUTO FIND: ${opts.keyword}`)
    .setDescription(`\`\`\`\n${opts.table}\n\`\`\``)
    .setColor(colorHex)
    .addFields(
      { name: "Server", value: opts.server.toUpperCase(), inline: true },
      { name: "Found", value: `${opts.found}/${opts.max}`, inline: true }
    )
    .setFooter({
      text: `${AUTHOR_NAME} | Refreshing Every 10s`,
    })
    .setTimestamp();
}

function resolveColor(color: string): number {
  const map: Record<string, number> = {
    Blue: 0x3498db, Green: 0x2ecc71, Yellow: 0xf1c40f,
    Orange: 0xffa500, Red: 0xe74c3c, Purple: 0x9b59b6,
    Aqua: 0x1abc9c, Gold: 0xf39c12, DarkBlue: 0x2c3e50,
    DarkGreen: 0x27ae60, DarkPurple: 0x8e44ad,
  };
  return map[color] || 0x3498db;
}
