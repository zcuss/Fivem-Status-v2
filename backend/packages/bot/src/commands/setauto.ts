// ============================================================
// /setauto — Set auto find (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";
import { getEffectiveAutoLimit, getServerCode } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("setauto")
  .setDescription("Set auto find (Admin)")
  .setDefaultMemberPermissions(0x8)
  .addStringOption((o) =>
    o.setName("server").setDescription("Server key").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("keyword").setDescription("Keyword nama player").setRequired(true)
  )
  .addChannelOption((o) =>
    o.setName("channel").setDescription("Channel tujuan (opsional)")
  );

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "❌ Admin only", flags: 64 });
  }
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ Perintah harus digunakan di server", flags: 64 });
  }

  const server = interaction.options.getString("server")?.toLowerCase();
  const keyword = interaction.options.getString("keyword")?.trim();
  const channel = interaction.options.getChannel("channel");
  const targetChannel = channel || interaction.channel;
  const channelId = targetChannel?.id || interaction.channelId;
  const discordId = interaction.user.id;
  const guildId = interaction.guildId;

  const serverCode = server ? await getServerCode(server) : null;
  if (!server || !serverCode) {
    return interaction.reply({ content: "❌ Server tidak ditemukan", flags: 64 });
  }

  if (!keyword) {
    return interaction.reply({ content: "❌ Keyword tidak valid", flags: 64 });
  }

  if (!targetChannel || !targetChannel.isTextBased()) {
    return interaction.reply({ content: "❌ Channel tujuan harus berupa text channel.", flags: 64 });
  }

  const count = await getEffectiveAutoLimit(discordId, guildId);
  const [[cnt]]: any[] = await db.execute(
    `SELECT COUNT(*) AS total FROM auto_find WHERE discord_id=?`,
    [discordId]
  );

  if ((cnt?.total ?? 0) >= count.max) {
    return interaction.reply({
      content: `❌ Limit Auto Find kamu sudah habis (${cnt?.total ?? 0}/${count.max})`,
      flags: 64,
    });
  }

  // Check duplicate
  const [[existing]]: any[] = await db.execute(
    `SELECT id FROM auto_find
     WHERE discord_id=? AND guild_id=? AND server_key=? AND keyword=? AND channel_id=?
     LIMIT 1`,
    [discordId, guildId, server, keyword, channelId]
  );

  if (existing) {
    return interaction.reply({ content: "❌ Auto Find dengan kombinasi itu sudah ada", flags: 64 });
  }

  // Send initial embed
  const { EmbedBuilder } = await import("discord.js");
  const embed = new EmbedBuilder()
    .setTitle(`🔍 AUTO FIND: ${keyword}`)
    .setDescription("```Loading...```")
    .setColor(0xffa500)
    .setTimestamp();

  const msg = await targetChannel.send({ embeds: [embed] });

  await db.execute(
    `INSERT INTO auto_find (discord_id, server_key, keyword, channel_id, message_id, guild_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [discordId, server, keyword, channelId, msg.id, guildId]
  );

  return interaction.reply({ content: "✅ Auto Find Aktif", flags: 64 });
}
