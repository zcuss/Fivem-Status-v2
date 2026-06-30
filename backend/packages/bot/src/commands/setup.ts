// ============================================================
// /setup — Ephemeral button menu for all bot features
// ============================================================

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Buka menu kontrol bot (ephemeral)");

const BRAND_COLOR = 0x3b82f6;

export async function execute(interaction: any, instance: any) {
  const embed = new EmbedBuilder()
    .setTitle("⚡ Fivem-Status Control Panel")
    .setDescription(
      "Pilih fitur yang ingin kamu gunakan.\nSemua panel bersifat **ephemeral** — hanya kamu yang bisa lihat."
    )
    .setColor(BRAND_COLOR)
    .setFooter({ text: "ZCUS BOT • Setup Panel" })
    .setTimestamp();

  // Row 1: Find & Search
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup:find")
      .setLabel("🔍 Find Player")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:playtime")
      .setLabel("⏱️ Playtime")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:steamhex")
      .setLabel("🏷️ Steam Hex")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:topplaytime")
      .setLabel("🏆 Top Playtime")
      .setStyle(ButtonStyle.Secondary),
  );

  // Row 2: Auto Find
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup:setauto")
      .setLabel("📡 Set Auto Find")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("setup:delauto")
      .setLabel("❌ Del Auto Find")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("setup:spy")
      .setLabel("🕵️ Spy Player")
      .setStyle(ButtonStyle.Secondary),
  );

  // Row 3: Server & Rank Management (admin)
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup:addserver")
      .setLabel("➕ Add Server")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:editserver")
      .setLabel("✏️ Edit Server")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:delserver")
      .setLabel("🗑️ Del Server")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("setup:setrank")
      .setLabel("🏅 Set Rank")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:delrank")
      .setLabel("❌ Del Rank")
      .setStyle(ButtonStyle.Danger),
  );

  // Row 4: Info & Settings
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setup:profile")
      .setLabel("👤 Profile")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:listserver")
      .setLabel("📋 Servers")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:commandlogs")
      .setLabel("📜 Logs")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:settings")
      .setLabel("⚙️ Settings")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("setup:back")
      .setLabel("◀️ Kembali")
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2, row3, row4],
    flags: 0x40, // Ephemeral
  });
}
