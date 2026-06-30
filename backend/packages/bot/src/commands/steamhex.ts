// ============================================================
// /steamhex — Search steam hex by player name
// ============================================================

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { db } from "@fivem/db";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDateTimeWIB(date: Date): string {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatLastSeen(value: any): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return formatDateTimeWIB(d);
}

function canonicalPlayerName(value: string): string {
  let name = String(value || "").trim();
  if (!name) return "Unknown";
  let prev = "";
  while (name && name !== prev) {
    prev = name;
    name = name.replace(/^[`"'|]+/g, "").trim();
    name = name.replace(/^\[\d+\/\d+\]\s*/g, "");
    name = name.replace(/^\[\d+\]\s*/g, "");
    name = name.replace(/^\(\d+\/\d+\)\s*/g, "");
    name = name.replace(/^\(\d+\)\s*/g, "");
    name = name.replace(/^\d+\.\s*/g, "");
    name = name.replace(/^-\s*/g, "");
    name = name.replace(/^[`"'|]+/g, "").trim();
  }
  return name.replace(/\s+/g, " ").trim() || "Unknown";
}

function normalizeSteamHexInput(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("steam:")) {
    if (!/^steam:[a-z0-9]+$/.test(raw)) return "";
    if (raw.length > 32) return "";
    return raw;
  }
  if (!/^[a-z0-9]+$/.test(raw)) return "";
  if (raw.length > 26) return "";
  return `steam:${raw}`;
}

// Pagination session store
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessionStore = new Map<string, { userId: string; rows: any[]; createdAt: number }>();

function cleanupSessions(now = Date.now()) {
  for (const [key, value] of sessionStore.entries()) {
    if (now - value.createdAt > SESSION_TTL_MS) sessionStore.delete(key);
  }
}

function createSession(userId: string, rows: any[]): string {
  cleanupSessions();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStore.set(token, { userId, rows, createdAt: Date.now() });
  return token;
}

export function getSession(token: string) {
  cleanupSessions();
  return sessionStore.get(token);
}

const BUTTON_PREFIX = "steamhex_page:";
export { BUTTON_PREFIX };

const PAGE_SIZE = 10;

function formatLines(rows: any[]): string[] {
  return rows.map((r) => {
    const name = canonicalPlayerName(r.player_name);
    const steam = String(r.steam_hex || "steam:unknown");
    const totalPlaytime = Math.max(0, Number(r.total_playtime) || 0);
    const last = formatLastSeen(r.last_seen);
    return `${name} ${steam}\nPlayTime ${formatDuration(totalPlaytime)}\nLast Play ${last}`;
  });
}

function buildPage(rows: any[], page: number, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const slice = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const lines = formatLines(slice);
  let body = lines.join("\n\n");
  if (body.length > 3800) {
    body = body.slice(0, 3790) + "\n...";
  }
  return { body, totalPages, page: safePage };
}

function buildNavButtons(sessionToken: string, page: number, totalPages: number) {
  if (totalPages <= 1) return null;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}${sessionToken}:${Math.max(page - 1, 0)}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_PREFIX}${sessionToken}:${Math.min(page + 1, totalPages - 1)}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

async function fetchSteamHexRows(input: string) {
  const search = String(input || "").trim();
  const exactSteam = normalizeSteamHexInput(search);
  const like = `%${search}%`;

  let rows: any[] = [];
  if (exactSteam) {
    [rows] = await db.execute(
      `SELECT steam_hex, player_name, player_key, last_seen
       FROM steam_players
       WHERE steam_hex = ? OR player_name LIKE ?
       ORDER BY last_seen DESC`,
      [exactSteam, like]
    );
  } else {
    [rows] = await db.execute(
      `SELECT steam_hex, player_name, player_key, last_seen
       FROM steam_players
       WHERE player_name LIKE ?
       ORDER BY last_seen DESC`,
      [like]
    );
  }

  if (!rows?.length) return rows;

  // Get total playtime
  const uniqueKeys = Array.from(new Set(rows.map((r: any) => String(r.player_key || "")).filter(Boolean)));
  const totalByKey = new Map<string, number>();
  const chunkSize = 500;

  for (let i = 0; i < uniqueKeys.length; i += chunkSize) {
    const chunk = uniqueKeys.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const [sumRows]: any[] = await db.execute(
      `SELECT p.player_key, COALESCE(SUM(t.playtime_seconds), 0) AS total_playtime
       FROM (
         SELECT player_ref, playtime_seconds FROM playtime_daily_hot
         UNION ALL
         SELECT player_ref, playtime_seconds FROM playtime_daily_archive
       ) t
       JOIN playtime_players p ON p.id=t.player_ref
       WHERE p.player_key IN (${placeholders})
       GROUP BY player_key`,
      chunk
    );
    for (const row of sumRows || []) {
      totalByKey.set(String(row.player_key || ""), Number(row.total_playtime) || 0);
    }
  }

  rows = rows.map((row: any) => ({
    ...row,
    total_playtime: totalByKey.get(String(row.player_key || "").trim()) || 0,
  }));

  // Merge by steam hex + name
  const merged = new Map<string, any>();
  for (const row of rows) {
    const steamHex = String(row.steam_hex || "").toLowerCase();
    if (!steamHex) continue;
    const canonicalName = canonicalPlayerName(row.player_name);
    const key = `${steamHex}::${canonicalName.toLowerCase()}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...row, player_name: canonicalName });
      continue;
    }
    const rowTime = new Date(row.last_seen).getTime() || 0;
    const prevTime = new Date(prev.last_seen).getTime() || 0;
    merged.set(key, {
      ...prev,
      player_name: canonicalName,
      last_seen: rowTime > prevTime ? row.last_seen : prev.last_seen,
      total_playtime: Math.max(prev.total_playtime || 0, row.total_playtime || 0),
    });
  }

  return Array.from(merged.values());
}

export const data = new SlashCommandBuilder()
  .setName("steamhex")
  .setDescription("Cari steam hex berdasarkan nama/steamhex")
  .addStringOption((o) =>
    o.setName("nama").setDescription("Nama player atau steamhex").setRequired(true)
  );

export async function execute(interaction: any, instance: any) {
  const input = interaction.options.getString("nama")?.trim();
  if (!input) {
    return interaction.reply({ content: "Nama/Steamhex tidak valid.", flags: 64 });
  }

  const rows = await fetchSteamHexRows(input);
  if (!rows.length) {
    return interaction.reply({ content: "Data tidak ditemukan.", flags: 64 });
  }

  const sessionToken = createSession(interaction.user.id, rows);
  const { body, totalPages } = buildPage(rows, 0);
  const nav = buildNavButtons(sessionToken, 0, totalPages);

  return interaction.reply({
    embeds: [
      {
        color: 0x3498db,
        title: "Steam Hex",
        description: `\`\`\`\n${body}\n\`\`\``,
        footer: { text: `Page 1/${totalPages}` },
      },
    ],
    components: nav ? [nav] : [],
  });
}

// Handle button interactions
export async function handleButton(interaction: any) {
  const customId = interaction.customId;
  if (!customId.startsWith(BUTTON_PREFIX)) return false;

  await interaction.deferUpdate();
  cleanupSessions();

  const parts = customId.replace(BUTTON_PREFIX, "").split(":");
  const sessionToken = parts[0];
  const page = parseInt(parts[1] || "0", 10);
  const entry = sessionStore.get(sessionToken);
  if (!entry || entry.userId !== interaction.user.id || !Number.isFinite(page)) {
    return interaction.editReply({ content: "Request sudah kadaluarsa.", components: [] });
  }

  const { body, totalPages, page: safePage } = buildPage(entry.rows, page);
  const nav = buildNavButtons(sessionToken, safePage, totalPages);

  return interaction.editReply({
    content: "",
    embeds: [
      {
        color: 0x3498db,
        title: "Steam Hex",
        description: `\`\`\`\n${body}\n\`\`\``,
        footer: { text: `Page ${safePage + 1}/${totalPages}` },
      },
    ],
    components: nav ? [nav] : [],
  });
}
