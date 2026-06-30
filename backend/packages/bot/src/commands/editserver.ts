// ============================================================
// /editserver — Edit server (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList, normalizeServerCode } from "@fivem/shared";
import { ensureUserRole } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("editserver")
  .setDescription("Edit server (Admin)")
  .setDefaultMemberPermissions(0)
  .addStringOption((o) =>
    o.setName("id").setDescription("ID server").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("kodeserver").setDescription("Kode server baru").setRequired(true)
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
  const serverCode = normalizeServerCode(
    interaction.options.getString("kodeserver")?.trim()
  );

  if (!serverKeyRaw || !serverCode) {
    return interaction.reply({ content: "X ID server atau kodeserver tidak valid", flags: 64 });
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
    await db.execute(
      `INSERT INTO server_change_requests (server_key, requested_by, proposed_code)
       VALUES ($1, $2, $3)`,
      [serverKey, discordId, serverCode]
    );
    return interaction.reply({
      content: `OK Request perubahan untuk **${serverKey}** dikirim`,
      flags: 64,
    });
  }

  await db.execute(
    `UPDATE server_configs SET server_code=$1 WHERE server_key=$2`,
    [serverCode, serverKey]
  );

  return interaction.reply({
    content: `OK Server **${serverKey}** berhasil diupdate`,
    flags: 64,
  });
}
