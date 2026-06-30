// ============================================================
// /addserver — Add server (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList, normalizeServerCode } from "@fivem/shared";
import { ensureUserRole } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("addserver")
  .setDescription("Tambah server baru (Admin)")
  .setDefaultMemberPermissions(0)
  .addStringOption((o) =>
    o.setName("id").setDescription("ID server").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("kodeserver").setDescription("Kode server").setRequired(true)
  );

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({
      content: "❌ Kamu tidak punya akses",
      flags: 64,
    });
  }

  const serverKeyRaw = interaction.options.getString("id")?.trim();
  const serverCode = normalizeServerCode(
    interaction.options.getString("kodeserver")?.trim()
  );

  if (!serverKeyRaw || !serverCode) {
    return interaction.reply({ content: "❌ ID server atau kodeserver tidak valid", flags: 64 });
  }

  const serverKey = serverKeyRaw.toLowerCase();
  const discordId = interaction.user.id;

  await ensureUserRole(discordId);

  const [rows] = await db.execute(
    `SELECT server_key FROM server_configs WHERE server_key=$1 LIMIT 1`,
    [serverKey]
  );
  if ((rows as any[]).length) {
    return interaction.reply({
      content: `X Server **${serverKey}** sudah ada`,
      flags: 64,
    });
  }

  await db.execute(
    `INSERT INTO server_configs (server_key, server_code, created_by) VALUES ($1, $2, $3)`,
    [serverKey, serverCode, discordId]
  );

  return interaction.reply({
    content: `OK Server **${serverKey}** berhasil ditambahkan`,
    flags: 64,
  });
}
