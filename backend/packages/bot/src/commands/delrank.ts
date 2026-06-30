// ============================================================
// /delrank — Delete rank by steamhex (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";

export const data = new SlashCommandBuilder()
  .setName("delrank")
  .setDescription("Hapus rank berdasarkan steamhex (Admin)")
  .setDefaultMemberPermissions(0)
  .addStringOption((o) =>
    o.setName("steamhex").setDescription("Contoh: steam:110000117145eb3").setRequired(true)
  );

function normalizeSteamHex(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw.startsWith("steam:") ? raw : `steam:${raw}`;
  if (!/^steam:[a-z0-9]+$/.test(normalized)) return "";
  if (normalized.length > 32) return "";
  return normalized;
}

export async function execute(interaction: any, instance: any) {
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({
      content: "X Admin only",
      flags: 64,
    });
  }

  const steamHex = normalizeSteamHex(interaction.options.getString("steamhex"));
  if (!steamHex) {
    return interaction.reply({
      content: "X steamhex tidak valid",
      flags: 64,
    });
  }

  const [result] = await db.execute(
    `DELETE FROM steam_player_ranks
     WHERE owner_discord_id=$1 AND steam_hex=$2
     RETURNING id`,
    [interaction.user.id, steamHex]
  );

  if (!(result as any[]).length) {
    return interaction.reply({
      content: `X Rank untuk ${steamHex} tidak ditemukan`,
      flags: 64,
    });
  }

  return interaction.reply({
    content: `OK Rank ${steamHex} berhasil dihapus`,
    flags: 64,
  });
}
