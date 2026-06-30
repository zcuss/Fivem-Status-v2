// ============================================================
// /setephemeral — Toggle ephemeral replies (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";
import { setCommandsEphemeralCache } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("setephemeral")
  .setDescription("Toggle reply ephemeral untuk server ini (Admin)")
  .setDefaultMemberPermissions(0)
  .addBooleanOption((o) =>
    o.setName("enabled").setDescription("Aktifkan reply ephemeral").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("command")
      .setDescription("Nama command (kosong = semua)")
      .setRequired(false)
      .addChoices(
        { name: "find", value: "find" },
        { name: "spy", value: "spy" },
        { name: "playtime", value: "playtime" },
        { name: "topplaytime", value: "topplaytime" },
        { name: "setauto", value: "setauto" },
        { name: "delauto", value: "delauto" },
        { name: "profile", value: "profile" },
        { name: "addserver", value: "addserver" },
        { name: "editserver", value: "editserver" },
        { name: "delserver", value: "delserver" },
        { name: "listserver", value: "listserver" },
        { name: "setephemeral", value: "setephemeral" },
        { name: "setvoice", value: "setvoice" },
        { name: "steamhex", value: "steamhex" },
        { name: "setrank", value: "setrank" },
        { name: "delrank", value: "delrank" },
        { name: "commandlogs", value: "commandlogs" }
      )
  );

export async function execute(interaction: any, instance: any) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "❌ Command ini hanya bisa dipakai di server." });
  }
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "❌ Admin only" });
  }

  const enabled = interaction.options.getBoolean("enabled");
  const command = interaction.options.getString("command");
  const allowed = new Set([
    "find", "spy", "playtime", "topplaytime", "steamhex",
    "setauto", "delauto", "profile", "addserver", "editserver",
    "delserver", "listserver", "setephemeral", "setvoice",
    "setrank", "delrank", "commandlogs",
  ]);
  if (command && !allowed.has(command)) {
    return interaction.reply({ content: "❌ Command tidak dikenal." });
  }

  try {
    const settingKey = command
      ? `commands_ephemeral.${command}`
      : "commands_ephemeral";

    await db.execute(
      `INSERT INTO guild_settings (guild_id, setting_key, setting_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (guild_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      [interaction.guildId, settingKey, enabled ? "true" : "false"]
    );

    setCommandsEphemeralCache(interaction.guildId, enabled, command || null);

    return interaction.reply({
      content: `✅ Ephemeral ${enabled ? "ON" : "OFF"} untuk ${command || "semua command"} di server ini.`
    });
  } catch (err: any) {
    return interaction.reply({ content: `❌ ${err.message}` });
  }
}
