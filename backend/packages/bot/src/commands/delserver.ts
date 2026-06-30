// ============================================================
// /delserver — Delete server (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";
import { ensureUserRole } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("delserver")
  .setDescription("Hapus server (Admin)")
  .setDefaultMemberPermissions(0)
  .addStringOption((o) =>
    o.setName("id").setDescription("ID server").setRequired(true)
  );

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({
      content: "X Kamu tidak punya akses",
      flags: 64,
    });
  }

  const serverKeyRaw = interaction.options.getString("id")?.trim();
  if (!serverKeyRaw) {
    return interaction.reply({ content: "X ID server tidak valid", flags: 64 });
  }

  const serverKey = serverKeyRaw.toLowerCase();
  const discordId = interaction.user.id;

  await ensureUserRole(discordId);

  const [rows] = await db.execute(
    `SELECT created_by FROM server_configs WHERE server_key=$1 LIMIT 1`,
    [serverKey]
  );
  const server = (rows as any[])[0];

  if (!server) {
    return interaction.reply({
      content: `X Server **${serverKey}** tidak ditemukan`,
      flags: 64,
    });
  }

  if (String(server.created_by) !== String(discordId)) {
    return interaction.reply({
      content: `X Hanya owner yang bisa hapus server **${serverKey}**`,
      flags: 64,
    });
  }

  await db.execute(`DELETE FROM server_configs WHERE server_key=$1`, [serverKey]);
  await db.execute(`DELETE FROM auto_find WHERE server_key=$1`, [serverKey]);

  return interaction.reply({
    content: `OK Server **${serverKey}** berhasil dihapus`,
    flags: 64,
  });
}
