// ============================================================
// /topplaytime - Top playtime ranking by keyword
// ============================================================

import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AUTHOR_NAME } from "@fivem/shared";
import { db } from "@fivem/db";
import { DEFAULT_USER_LOGO } from "@fivem/shared";

async function getServerCode(serverKey: string): Promise<string | null> {
  const [[row]]: any[] = await db.execute(
    `SELECT server_code FROM server_configs WHERE server_key=$1 LIMIT 1`,
    [serverKey]
  );
  return row?.server_code || null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeSearch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function nowWIB(): Date {
  return new Date(Date.now() + 7 * 3600 * 1000);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value || "-");
  return d.toLocaleDateString("id-ID");
}

function formatFooterTimeWIB(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().replace("T", " ").slice(0, 19) + " WIB";
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const CANDIDATE_LIMIT = 3000;

export const data = new SlashCommandBuilder()
  .setName("topplaytime")
  .setDescription("Top playtime by keyword (minggu/bulan)")
  .addStringOption((o) =>
    o.setName("keyword").setDescription("Keyword nama / steamhex / rank").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("periode").setDescription("Periode ranking").setRequired(true)
      .addChoices(
        { name: "minggu", value: "minggu" },
        { name: "bulan", value: "bulan" }
      )
  )
  .addStringOption((o) =>
    o.setName("server").setDescription("Server key (opsional, kosong = global)")
  )
  .addIntegerOption((o) =>
    o.setName("limit").setDescription("Jumlah top (default 10, max 20)")
  );

export async function execute(interaction: any, instance: any) {
  const keywordRaw = interaction.options.getString("keyword") || "";
  const period = String(interaction.options.getString("periode") || "").toLowerCase();
  const server = String(interaction.options.getString("server") || "").toLowerCase();
  const limitInput = Number(interaction.options.getInteger("limit") || DEFAULT_LIMIT);

  const keywordNorm = normalizeSearch(keywordRaw);
  if (!keywordNorm) {
    return interaction.reply({ content: "X Keyword tidak valid", flags: 64 });
  }

  if (!["minggu", "bulan"].includes(period)) {
    return interaction.reply({ content: "X Periode tidak valid", flags: 64 });
  }

  if (server) {
    const serverCode = await getServerCode(server);
    if (!serverCode) {
      return interaction.reply({ content: "X Server tidak ditemukan", flags: 64 });
    }
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, limitInput));
  const now = nowWIB();
  const end = formatYmd(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (period === "bulan" ? 29 : 6));
  const startStr = formatYmd(start);

  const whereServerSql = server ? "AND server_key=?" : "";
  const serverParams = server ? [server] : [];

  const [rows]: any[] = await db.execute(
    `SELECT p.id AS player_ref,
            p.latest_player_id AS player_id,
            p.latest_name AS player_name,
            p.player_key,
            SUM(t.playtime_seconds) AS total_seconds
     FROM (
       SELECT player_ref, server_key, play_date, playtime_seconds
       FROM playtime_daily_hot
       WHERE play_date BETWEEN ? AND ? ${whereServerSql}
       UNION ALL
       SELECT player_ref, server_key, play_date, playtime_seconds
       FROM playtime_daily_archive
       WHERE play_date BETWEEN ? AND ? ${whereServerSql}
     ) t
     JOIN playtime_players p ON p.id = t.player_ref
     GROUP BY p.id, p.latest_player_id, p.latest_name, p.player_key
     ORDER BY total_seconds DESC
     LIMIT ${CANDIDATE_LIMIT}`,
    [startStr, end, ...serverParams, startStr, end, ...serverParams]
  );

  if (!rows?.length) {
    return interaction.reply({ content: "X Data playtime tidak ditemukan", flags: 64 });
  }

  // Get steam hexes
  const playerKeys = rows.map((row: any) => String(row.player_key || ""));
  const steamMap = new Map<string, string>();
  const chunkSize = 500;

  for (let i = 0; i < playerKeys.length; i += chunkSize) {
    const chunk = playerKeys.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "?").join(",");
    const [steamRows]: any[] = await db.execute(
      `SELECT player_key, steam_hex, last_seen
       FROM steam_players
       WHERE player_key IN (${placeholders})
       ORDER BY last_seen DESC`,
      chunk
    );
    for (const row of steamRows || []) {
      const pk = String(row.player_key || "");
      if (!pk || steamMap.has(pk)) continue;
      steamMap.set(pk, String(row.steam_hex || "").toLowerCase());
    }
  }

  const steamHexes = Array.from(new Set(Array.from(steamMap.values()).filter(Boolean)));
  const rankMap = new Map<string, string>();

  if (steamHexes.length) {
    const placeholders = steamHexes.map(() => "?").join(",");
    const [rankRows]: any[] = await db.execute(
      `SELECT steam_hex, rank_label
       FROM steam_player_ranks
       WHERE steam_hex IN (${placeholders})
         AND owner_discord_id=?`,
      [...steamHexes, interaction.user.id]
    );
    for (const row of rankRows || []) {
      rankMap.set(String(row.steam_hex || "").toLowerCase(), String(row.rank_label || ""));
    }
  }

  const matched: { totalSeconds: number; displayName: string }[] = [];

  for (const row of rows || []) {
    const playerName = String(row.player_name || "");
    const playerKey = String(row.player_key || "");
    const steamHex = String(steamMap.get(playerKey) || "");
    const rank = String(rankMap.get(steamHex) || "");

    const nameMatch = normalizeSearch(playerName).includes(keywordNorm);
    const steamMatch = normalizeSearch(steamHex).includes(keywordNorm);
    const rankMatch = normalizeSearch(rank).includes(keywordNorm);
    if (!nameMatch && !steamMatch && !rankMatch) continue;

    const rankTag = rank ? ` [${rank.toUpperCase()}]` : "";
    const steamTag = steamHex ? ` (${steamHex})` : "";
    matched.push({
      totalSeconds: Number(row.total_seconds) || 0,
      displayName: `${playerName}${steamTag}${rankTag}`,
    });
  }

  matched.sort((a, b) => b.totalSeconds - a.totalSeconds);
  const topRows = matched.slice(0, limit);

  if (!topRows.length) {
    return interaction.reply({
      content: "X Tidak ada player yang cocok untuk keyword/periode tersebut",
      flags: 64,
    });
  }

  const lines = topRows.map((row, idx) => {
    const rankNo = String(idx + 1).padStart(2, "0");
    const nameText = String(row.displayName || "Unknown");
    const timeText = formatDuration(row.totalSeconds);
    return `${rankNo}. ${nameText}  ${timeText}`;
  });

  let body = lines.join("\n");
  if (body.length > 3800) body = `${body.slice(0, 3790)}\n...`;

  const scopeLabel = server ? server.toUpperCase() : "GLOBAL";
  const periodLabel = period.toUpperCase();
  const titleKeyword = keywordRaw.trim().toUpperCase();

  const embed = new EmbedBuilder()
    .setTitle(`TOP PLAYTIME ${titleKeyword} (${periodLabel})`)
    .setDescription(`\`\`\`\n${body}\n\`\`\``)
    .setColor(0xffa500)
    .addFields(
      { name: "Server", value: `\`\`\`\n${scopeLabel}\n\`\`\``, inline: true },
      { name: "Periode", value: `\`\`\`\n${formatShortDate(startStr)} - ${formatShortDate(end)}\n\`\`\``, inline: true },
      { name: "Jumlah Top", value: `\`\`\`\n${topRows.length}\n\`\`\``, inline: true }
    )
    .setFooter({ text: `${AUTHOR_NAME} | ${formatFooterTimeWIB()}` });

  return interaction.reply({ embeds: [embed] });
}
