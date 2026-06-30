// ============================================================
// /spy — View player detail by ID (Admin only)
// ============================================================

import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AUTHOR_NAME, DEFAULT_USER_LOGO, INTERVAL, parseDiscordIdList } from "@fivem/shared";
import { db } from "@fivem/db";
import { fetchPlayers } from "../services/server.js";
import { getSteamRanksByHexes, getServerCode } from "./helpers.js";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeName(name: string): string {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function playDateWIB(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFooterTimeWIB(): string {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return now.toISOString().replace("T", " ").slice(0, 19) + " WIB";
}

export const data = new SlashCommandBuilder()
  .setName("spy")
  .setDescription("Lihat detail player berdasarkan ID (Admin)")
  .setDefaultMemberPermissions(0x8) // Administrator
  .addStringOption((o) =>
    o.setName("server").setDescription("Key server (sesuai config)").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("id").setDescription("Player ID (FiveM)").setRequired(true)
  );

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "❌ Admin only", flags: 64 });
  }

  const server = interaction.options.getString("server")?.toLowerCase();
  const id = interaction.options.getInteger("id");

  const serverCode = server ? await getServerCode(server) : null;

  if (!server || !serverCode) {
    return interaction.reply({
      content: "❌ Server tidak ditemukan",
      flags: 64,
    });
  }

  const players = await fetchPlayers(serverCode);
  const player = players.find((p: any) => p.id === id);

  if (!player) {
    return interaction.reply({
      content: "❌ Player tidak ditemukan",
      flags: 64,
    });
  }

  const today = playDateWIB();
  const key = normalizeName(player.name);

  // Get playtime
  const [r]: any[] = await db.execute(
    `SELECT h.playtime_seconds
     FROM playtime_daily_hot h
     JOIN playtime_players p ON p.id = h.player_ref
     WHERE h.server_key=$1 AND h.play_date=$2 AND p.player_key=$3
     LIMIT 1`,
    [server, today, key]
  );
  const time = r?.length ? formatDuration(r[0].playtime_seconds) : "00:00:00";

  // Get steam hex
  const [steamRows]: any[] = await db.execute(
    `SELECT steam_hex FROM steam_players WHERE player_key=$1 ORDER BY last_seen DESC LIMIT 1`,
    [key]
  );
  const steamHex = steamRows?.length ? steamRows[0].steam_hex : "";

  const rankMap = await getSteamRanksByHexes([steamHex], interaction.user.id);
  const rank = rankMap.get(String(steamHex || "").toLowerCase()) || "";

  const table = [
    `ID   : ${player.id}`,
    `Name : ${player.name}`,
    `Steam: ${steamHex || "-"}`,
    `Rank : ${rank ? rank.toUpperCase() : "-"}`,
    `Ping : ${player.ping} ms`,
    `Time : ${time}`,
  ].join("\n");

  const thumbnailUrl = process.env.SPY_THUMBNAIL_URL || DEFAULT_USER_LOGO || null;

  const refreshSeconds = Math.max(1, Math.round(INTERVAL / 1000));

  const embed = new EmbedBuilder()
    .setTitle(`SPY (${player.id})`)
    .setDescription(`\`\`\`\n${table}\n\`\`\``)
    .setColor(0xffa500)
    .addFields(
      { name: "Server", value: `\`\`\`\n${server.toUpperCase()}\n\`\`\``, inline: true },
      { name: "Ditemukan", value: "```\n1\n```", inline: true },
      { name: "Player Online", value: `\`\`\`\n${players.length}\n\`\`\``, inline: true }
    )
    .setAuthor({ name: "ZCUS BOT | SPAYER" })
    .setFooter({ text: `${AUTHOR_NAME} | ${formatFooterTimeWIB()} | Refreshing Every ${refreshSeconds}s` })
    .setThumbnail(thumbnailUrl);

  return interaction.reply({ embeds: [embed] });
}
