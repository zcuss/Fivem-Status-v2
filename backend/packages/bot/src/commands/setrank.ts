// ============================================================
// /setrank — Set rank by steamhex (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";

export const data = new SlashCommandBuilder()
  .setName("setrank")
  .setDescription("Set/update rank berdasarkan steamhex (Admin)")
  .setDefaultMemberPermissions(0) // Admin-only at Discord level
  .addStringOption((o) =>
    o.setName("steamhex").setDescription("Contoh: steam:110000117145eb3").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("rank").setDescription("Contoh: admin/mod/helper").setRequired(true)
  );

function normalizeSteamHex(value: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw.startsWith("steam:") ? raw : `steam:${raw}`;
  if (!/^steam:[a-z0-9]+$/.test(normalized)) return "";
  if (normalized.length > 32) return "";
  return normalized;
}

function normalizeRank(value: string): string {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw || raw.length > 32) return "";
  if (!/^[a-z0-9 _-]+$/.test(raw)) return "";
  return raw;
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
  const rankLabel = normalizeRank(interaction.options.getString("rank"));

  if (!steamHex || !rankLabel) {
    return interaction.reply({
      content: "X steamhex/rank tidak valid",
      flags: 64,
    });
  }

  await db.execute(
    `INSERT INTO steam_player_ranks (owner_discord_id, steam_hex, rank_label)
     VALUES ($1, $2, $3)
     ON CONFLICT (owner_discord_id, steam_hex)
     DO UPDATE SET rank_label = EXCLUDED.rank_label, updated_at = CURRENT_TIMESTAMP`,
    [interaction.user.id, steamHex, rankLabel]
  );

  return interaction.reply({
    content: `OK Rank ${steamHex} => ${rankLabel.toUpperCase()} tersimpan`,
    flags: 64,
  });
}
