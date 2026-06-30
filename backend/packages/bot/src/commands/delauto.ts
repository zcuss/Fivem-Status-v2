// ============================================================
// /delauto — Delete auto find
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";

export const data = new SlashCommandBuilder()
  .setName("delauto")
  .setDescription("Hapus auto find")
  .addIntegerOption((o) =>
    o.setName("id").setDescription("ID auto (default 1)")
  );

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "❌ Admin only", flags: 64 });
  }

  const id = interaction.options.getInteger("id") ?? 1;
  const discordId = interaction.user.id;

  const [res] = await db.execute(
    `DELETE FROM auto_find WHERE id=$1 AND discord_id=$2 RETURNING id`,
    [id, discordId]
  );

  if (!(res as any[]).length) {
    return interaction.reply({ content: "❌ Auto tidak ditemukan", flags: 64 });
  }

  return interaction.reply({ content: `OK Auto ID ${id} dihapus`, flags: 64 });
}
