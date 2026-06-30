// ============================================================
// /setvoice — Set voice join bot (Admin only)
// ============================================================

import { SlashCommandBuilder, ChannelType } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";

export const data = new SlashCommandBuilder()
  .setName("setvoice")
  .setDescription("Set voice join bot (Admin)")
  .setDefaultMemberPermissions(0)
  .addChannelOption((o) =>
    o.setName("join_channel").setDescription("Voice/Stage channel untuk bot join").setRequired(false)
  )
  .addBooleanOption((o) =>
    o.setName("enabled").setDescription("Enable/disable voice join").setRequired(false)
  );

function isValidChannelId(value: any): boolean {
  return /^\d{10,25}$/.test(String(value || "").trim());
}

async function upsertSetting(guildId: string, key: string, value: string) {
  await db.execute(
    `INSERT INTO guild_settings (guild_id, setting_key, setting_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
    [guildId, key, String(value)]
  );
}

async function getCurrentVoiceSettings(guildId: string) {
  const [rows] = await db.execute(
    `SELECT setting_key, setting_value
     FROM guild_settings
     WHERE guild_id=$1 AND setting_key IN (
       'voice.enabled',
       'voice.join_channel_id',
       'voice.channel_id'
     )`,
    [guildId]
  );
  let joinEnabled = false;
  let joinChannelId = "";
  let legacyChannelId = "";
  for (const row of rows as any[]) {
    if (row.setting_key === "voice.enabled") {
      joinEnabled = String(row.setting_value) === "true";
    }
    if (row.setting_key === "voice.join_channel_id") {
      joinChannelId = String(row.setting_value || "");
    }
    if (row.setting_key === "voice.channel_id") {
      legacyChannelId = String(row.setting_value || "");
    }
  }
  if (!joinChannelId && legacyChannelId) joinChannelId = legacyChannelId;
  return { joinEnabled, joinChannelId };
}

export async function execute(interaction: any, instance: any) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: "ERROR: Command ini hanya bisa dipakai di server.",
      flags: 64,
    });
  }
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "ERROR: Admin only", flags: 64 });
  }

  const joinChannel = interaction.options.getChannel("join_channel");
  const joinEnabledRaw = interaction.options.getBoolean("enabled");

  if (
    joinChannel &&
    ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(joinChannel.type)
  ) {
    return interaction.reply({
      content: "ERROR: join_channel harus berupa Voice / Stage.",
      flags: 64,
    });
  }

  const current = await getCurrentVoiceSettings(interaction.guildId);
  const joinEnabled = joinEnabledRaw !== null ? joinEnabledRaw : current.joinEnabled;
  const joinChannelId = joinChannel?.id || current.joinChannelId;

  if (joinEnabled && !isValidChannelId(joinChannelId)) {
    return interaction.reply({ content: "ERROR: Join channel wajib diisi jika join aktif.", flags: 64 });
  }

  try {
    await upsertSetting(interaction.guildId, "voice.enabled", joinEnabled ? "true" : "false");
    if (joinEnabled || isValidChannelId(joinChannelId)) {
      await upsertSetting(interaction.guildId, "voice.join_channel_id", joinChannelId);
    }
    if (!joinEnabled) {
      await db.execute(
        `DELETE FROM guild_settings
         WHERE guild_id=$1 AND setting_key='voice.join_channel_id'`,
        [interaction.guildId]
      );
    }
    // Clean up legacy settings
    await db.execute(
      `DELETE FROM guild_settings
       WHERE guild_id=$1 AND setting_key IN ('voice.rename_enabled','voice.rename_channel_id','voice.name_prefix','voice.server_key')`,
      [interaction.guildId]
    );

    const summary = [];
    summary.push(`join: ${joinEnabled ? "on" : "off"}`);
    summary.push(`join_channel: ${joinChannelId ? `<#${joinChannelId}>` : "-"}`);

    return interaction.reply({
      content: `OK: ${summary.join(" | ")}`,
      flags: 64,
    });
  } catch (err: any) {
    return interaction.reply({
      content: `ERROR: ${err.message}`,
      flags: 64,
    });
  }
}
