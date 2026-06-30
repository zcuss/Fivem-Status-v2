// ============================================================
// Bot command helpers — ported from old Fivem-Status
// ============================================================

import { db } from "@fivem/db";
import { EmbedBuilder } from "discord.js";
import {
  parseDiscordIdList,
  nowWIB,
  formatDateYmd,
  normalizeServerCode,
} from "@fivem/shared";

// ===================== Constants =====================

export const AUTHOR_NAME = process.env.AUTHOR || "Zcus";
export const DEFAULT_USER_LOGO = process.env.DEFAULT_USER_LOGO || "";
export const DEV_DISCORD_IDS: string[] = parseDiscordIdList(
  process.env.ADMIN_IDS
)
  .concat(parseDiscordIdList(process.env.OWNER_IDS))
  .filter((id) => !!id)
  .map(String);

// ===================== DB Helpers =====================

export async function ensureUserRole(discordId: string | number) {
  if (!discordId) return;
  await db.execute(
    `INSERT INTO user_roles (discord_id, role, max_auto)
     VALUES ($1, 'user', 1) ON CONFLICT (discord_id) DO NOTHING`,
    [discordId]
  );
}

export function normalizeSearch(str: string): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDateIndo(dateInput: Date | string): string {
  const d = new Date(dateInput);
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}/${mm}/${yyyy}`;
}

export async function getUserAutoLimit(discordId: string | number) {
  const normalizedDiscordId = String(discordId || "").trim();
  if (normalizedDiscordId && DEV_DISCORD_IDS.includes(normalizedDiscordId)) {
    return { role: "dev", max: Infinity, expires: null, roleLabel: "Developer" };
  }

  await ensureUserRole(discordId);
  const [rows] = await db.execute(
    `SELECT role, max_auto, role_label, expires_at
     FROM user_roles
     WHERE discord_id=$1 LIMIT 1`,
    [discordId]
  );
  const row = (rows as any[])[0];

  if (!row) {
    return { role: "user", max: getDefaultLimit("user"), expires: null, roleLabel: null };
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    if (row.role === "user") {
      return {
        role: "user",
        max: row.max_auto ?? getDefaultLimit("user"),
        expires: null,
        roleLabel: row.role_label || null,
      };
    }
  }

  switch (row.role) {
    case "dev":
      return { role: "dev", max: Infinity, expires: null, roleLabel: row.role_label || null };
    case "custom":
      return { role: "custom", max: row.max_auto ?? getDefaultLimit("custom"), expires: row.expires_at, roleLabel: row.role_label || null };
    case "premium":
      return { role: "premium", max: row.max_auto ?? getDefaultLimit("premium"), expires: row.expires_at, roleLabel: row.role_label || null };
    case "donator":
      return { role: "donator", max: row.max_auto ?? getDefaultLimit("donator"), expires: row.expires_at, roleLabel: row.role_label || null };
    default:
      return { role: "user", max: row.max_auto ?? getDefaultLimit("user"), expires: row.expires_at, roleLabel: row.role_label || null };
  }
}

function getDefaultLimit(role: string): number {
  switch (role) {
    case "premium": return 3;
    case "donator": return 5;
    case "custom": return 10;
    default: return 1;
  }
}

async function getGuildRoleLimit(guildId: string, role: string): Promise<number | null> {
  if (!guildId || !role) return null;
  const [rows] = await db.execute(
    `SELECT setting_value
     FROM guild_settings
     WHERE guild_id=$1 AND setting_key=$2
     LIMIT 1`,
    [guildId, `role_limit.${role}`]
  );
  const row = (rows as any[])[0];
  if (!row || typeof row.setting_value !== "string") return null;
  const parsed = Number.parseInt(row.setting_value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export async function getEffectiveAutoLimit(discordId: string | number, guildId: string | null) {
  const base = await getUserAutoLimit(discordId);
  if (base.role === "dev") return { ...base, max: Infinity };
  let limit = base.max;
  try {
    const override = await getGuildRoleLimit(guildId || "", base.role);
    if (Number.isFinite(override)) limit = override;
  } catch (err: any) {
    if (err?.code !== "42P01" && err?.code !== "ER_NO_SUCH_TABLE") throw err;
  }
  return { ...base, max: limit };
}

// ===================== Ephemeral Cache =====================

const cachedEphemeral = new Map<string, { value: boolean; fetchedAt: number }>();

export async function getCommandsEphemeralSetting(guildId: string | null, commandName?: string): Promise<boolean> {
  const scope = String(guildId || "global");
  const cmd = commandName ? commandName.toLowerCase() : "default";
  const key = `${scope}:${cmd}`;
  const now = Date.now();
  const cached = cachedEphemeral.get(key);
  if (cached && now - cached.fetchedAt < 30000) return cached.value;

  let value = true;
  let hasGuildSetting = false;
  try {
    if (guildId) {
      if (commandName) {
        const [rows] = await db.execute(
          `SELECT setting_value
           FROM guild_settings
           WHERE guild_id=$1 AND setting_key=$2
           LIMIT 1`,
          [guildId, `commands_ephemeral.${cmd}`]
        );
        const row = (rows as any[])[0];
        if (row && typeof row.setting_value === "string") {
          value = row.setting_value === "true";
          hasGuildSetting = true;
        }
      }

      const [rows2] = await db.execute(
        `SELECT setting_value
         FROM guild_settings
         WHERE guild_id=$1 AND setting_key='commands_ephemeral'
         LIMIT 1`,
        [guildId]
      );
      const row2 = (rows2 as any[])[0];
      if (row2 && typeof row2.setting_value === "string") {
        if (!hasGuildSetting) value = row2.setting_value === "true";
        hasGuildSetting = true;
      }
    }
  } catch (err: any) {
    if (err?.code === "42P01" || err?.code === "ER_NO_SUCH_TABLE") {
      value = true;
    } else {
      throw err;
    }
  }

  cachedEphemeral.set(key, { value, fetchedAt: now });
  return value;
}

export function setCommandsEphemeralCache(guildId: string | null, value: boolean, commandName?: string | null) {
  const scope = String(guildId || "global");
  const cmd = commandName ? commandName.toLowerCase() : "default";
  const key = `${scope}:${cmd}`;
  cachedEphemeral.set(key, { value, fetchedAt: Date.now() });
}

// ===================== Server Code =====================

export async function getServerCode(serverKey: string): Promise<string | null> {
  const key = String(serverKey || "").trim().toLowerCase();
  if (!key) return null;
  const [rows] = await db.execute(
    `SELECT server_code FROM server_configs WHERE server_key=$1 LIMIT 1`,
    [key]
  );
  const row = (rows as any[])[0];
  return row?.server_code || null;
}

// ===================== Footer / Time Formatting =====================

export function formatFooterTimeWIB(): string {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  return wib.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const WIB_OFFSET = 7 * 60 * 60 * 1000;

export function formatDateTimeWIB(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const wib = new Date(d.getTime() + WIB_OFFSET);
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  const ss = String(wib.getUTCSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

// ===================== Steam Ranks =====================

export async function getSteamRanksByHexes(
  steamHexes: string[],
  ownerDiscordId: string | number
): Promise<Map<string, string>> {
  const normalized = Array.from(
    new Set(
      steamHexes
        .map((hex) => String(hex || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const map = new Map<string, string>();
  if (!normalized.length || !ownerDiscordId) return map;

  const normalizedOwnerId = String(ownerDiscordId || "").trim();
  const ownerIds = DEV_DISCORD_IDS.includes(normalizedOwnerId)
    ? [normalizedOwnerId, "0"]
    : [normalizedOwnerId];

  // Build parameterized query for PG
  const ownerPlaceholders = ownerIds.map((_, i) => `$${i + 1}`).join(", ");
  const steamStart = ownerIds.length + 1;
  const steamPlaceholders = normalized.map((_, i) => `$${steamStart + i}`).join(", ");
  const orderIdx = ownerIds.length + normalized.length + 1;

  let rows: any[] = [];
  try {
    const [legacyRows] = await db.execute(
      `SELECT owner_discord_id, steam_hex, rank_label
       FROM steam_player_ranks
       WHERE owner_discord_id IN (${ownerPlaceholders})
         AND steam_hex IN (${steamPlaceholders})
       ORDER BY CASE WHEN owner_discord_id=$${orderIdx} THEN 0 ELSE 1 END, updated_at DESC`,
      [...ownerIds, ...normalized, normalizedOwnerId]
    );
    rows = legacyRows as any[];
  } catch (err: any) {
    if (String(err?.code || "") !== "42P01" && String(err?.code || "") !== "ER_NO_SUCH_TABLE") throw err;
    const [modernRows] = await db.execute(
      `SELECT owner_discord_user_id AS owner_discord_id, steam_hex, rank_label
       FROM players_rank_steam
       WHERE owner_discord_user_id IN (${ownerPlaceholders})
         AND steam_hex IN (${steamPlaceholders})
       ORDER BY CASE WHEN owner_discord_user_id=$${orderIdx} THEN 0 ELSE 1 END, updated_at DESC`,
      [...ownerIds, ...normalized, normalizedOwnerId]
    );
    rows = modernRows as any[];
  }

  for (const row of rows) {
    const steamHex = String(row.steam_hex || "").toLowerCase();
    const rank = String(row.rank_label || "").trim().toLowerCase();
    if (steamHex && rank && !map.has(steamHex)) map.set(steamHex, rank);
  }
  return map;
}

// ===================== Refresh Embed =====================

export function makeRefreshEmbed(opts: {
  keyword: string;
  server: string;
  table: string;
  found: number;
  max: number;
}): EmbedBuilder {
  const refreshSeconds = Math.max(1, Math.round((Number(process.env.BOT_INTERVAL_MS) || 10000) / 1000));
  const thumbnailUrl = process.env.SPY_THUMBNAIL_URL || DEFAULT_USER_LOGO || "";

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Auto Find: ${opts.keyword}`)
    .setDescription(`\`\`\`\n${opts.table}\n\`\`\``)
    .setColor(opts.found > 0 ? 0x57f287 : 0xffa500)
    .addFields(
      { name: "Server", value: `\`\`\`\n${opts.server.toUpperCase()}\n\`\`\``, inline: true },
      { name: "Found", value: `\`\`\`\n${opts.found}\n\`\`\``, inline: true },
      { name: "Max", value: `\`\`\`\n${opts.max}\n\`\`\``, inline: true }
    )
    .setAuthor({ name: `${AUTHOR_NAME} | Auto Find` })
    .setFooter({
      text: `${AUTHOR_NAME} | ${formatFooterTimeWIB()} | Refreshing Every ${refreshSeconds}s`,
    });

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

  return embed;
}
