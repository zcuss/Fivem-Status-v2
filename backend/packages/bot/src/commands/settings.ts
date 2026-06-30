// ============================================================
// /settings — Config panel with autofind list, ranks, servers
// ============================================================

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";
import { botEmbed, errorEmbed } from "./embeds.js";

export const data = new SlashCommandBuilder()
  .setName("settings")
  .setDescription("Buka panel pengaturan bot");

export async function execute(interaction: any, instance: any) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ Server only", flags: 0x40 });
  }

  await interaction.deferReply({ flags: 0x40 });

  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  // Get user's auto finds
  let autoFinds: any[] = [];
  try {
    const [rows] = await db.execute(
      `SELECT id, server_key, keyword, channel_id, created_at FROM auto_find WHERE discord_id=$1 AND guild_id=$2 ORDER BY created_at DESC`,
      [userId, guildId]
    );
    autoFinds = rows as any[];
  } catch {}

  // Get user's ranks
  let ranks: any[] = [];
  try {
    const [rows] = await db.execute(
      `SELECT steam_hex, rank_label, updated_at FROM steam_player_ranks WHERE owner_discord_id=$1 ORDER BY updated_at DESC LIMIT 20`,
      [userId]
    );
    ranks = rows as any[];
  } catch {}

  // Get servers
  let servers: any[] = [];
  try {
    const [rows] = await db.execute(`SELECT server_key, server_code FROM server_configs ORDER BY server_key`);
    servers = rows as any[];
  } catch {}

  // Build embed
  const fields: any[] = [];

  // Auto Find section
  if (autoFinds.length > 0) {
    const autoList = autoFinds.map((a) => `\`${a.id}\` \`${a.server_key}\` → \`${a.keyword}\` <#${a.channel_id}>`).join("\n");
    fields.push({ name: `📡 Auto Find (${autoFinds.length})`, value: autoList.length > 1024 ? autoList.slice(0, 1020) + "..." : autoList });
  } else {
    fields.push({ name: "📡 Auto Find", value: "`Belum ada auto find`" });
  }

  // Ranks section
  if (ranks.length > 0) {
    const rankList = ranks.map((r) => `\`${r.steam_hex}\` → **${r.rank_label}**`).join("\n");
    fields.push({ name: `🏅 Steam Ranks (${ranks.length})`, value: rankList.length > 1024 ? rankList.slice(0, 1020) + "..." : rankList });
  } else {
    fields.push({ name: "🏅 Steam Ranks", value: "`Belum ada rank`" });
  }

  // Servers section
  if (servers.length > 0) {
    const serverList = servers.map((s) => `\`${s.server_key}\` → \`${s.server_code}\``).join("\n");
    fields.push({ name: `🖥️ Servers (${servers.length})`, value: serverList.length > 1024 ? serverList.slice(0, 1020) + "..." : serverList });
  } else {
    fields.push({ name: "🖥️ Servers", value: "`Belum ada server`" });
  }

  // Buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("setup:setauto").setLabel("📡 Add Auto").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("setup:delauto").setLabel("❌ Del Auto").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("setup:setrank").setLabel("🏅 Set Rank").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("setup:delrank").setLabel("❌ Del Rank").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("setup:addserver").setLabel("➕ Add Server").setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({
    embeds: [
      botEmbed({
        title: "⚙️ Settings Panel",
        description: `User: <@${userId}> | Guild: \`${guildId}\``,
        fields,
        color: 0x6366f1,
      }),
    ],
    components: [row],
  });
}
