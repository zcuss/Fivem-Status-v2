// ============================================================
// /commandlogs — View command usage logs (Admin only)
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList } from "@fivem/shared";
import { AUTHOR_NAME, formatFooterTimeWIB } from "./helpers.js";

export const data = new SlashCommandBuilder()
  .setName("commandlogs")
  .setDescription("Lihat log pemakaian command di server ini (Admin)")
  .setDefaultMemberPermissions(0)
  .addStringOption((opt) =>
    opt.setName("user").setDescription("Filter Discord ID / username / display name (opsional)").setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName("command").setDescription("Filter nama command, contoh: find (opsional)").setRequired(false)
  )
  .addStringOption((opt) =>
    opt.setName("server").setDescription("Filter server key, contoh: alpha (opsional)").setRequired(false)
  )
  .addIntegerOption((opt) =>
    opt.setName("limit").setDescription("Jumlah log (default 10, max 20)").setRequired(false)
  );

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function formatTs(value: any): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID");
}

function buildLine(row: any): string {
  const ts = formatTs(row.created_at);
  const user = String(row.display_name || row.username || row.discord_id || "-");
  const cmd = `/${String(row.command_name || "-")}`;
  const server = String(row.server_key || "-").toUpperCase();
  const query = String(row.query_text || "-");
  return `[${ts}] ${user} | ${cmd} | ${server} | ${query}`;
}

export async function execute(interaction: any, instance: any) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "X Command ini hanya bisa di server", flags: 64 });
  }
  const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
  if (!adminIds.includes(Number(interaction.user.id))) {
    return interaction.reply({ content: "X Admin only", flags: 64 });
  }


  const userInput = String(interaction.options.getString("user") || "").trim();
  const commandName = String(interaction.options.getString("command") || "").trim().toLowerCase();
  const serverKey = String(interaction.options.getString("server") || "").trim().toLowerCase();
  const limitInput = Number(interaction.options.getInteger("limit") || DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, limitInput));

  // Build dynamic WHERE clause with proper PG params
  const conditions: string[] = ["guild_id=$1"];
  const params: any[] = [interaction.guildId];
  let paramIdx = 2;

  if (userInput) {
    if (/^\d{5,20}$/.test(userInput)) {
      conditions.push(`discord_id=$${paramIdx}`);
      params.push(userInput);
      paramIdx++;
    } else {
      conditions.push(`(LOWER(display_name) LIKE $${paramIdx} OR LOWER(username) LIKE $${paramIdx + 1})`);
      const like = `%${userInput.toLowerCase()}%`;
      params.push(like, like);
      paramIdx += 2;
    }
  }
  if (commandName) {
    conditions.push(`command_name=$${paramIdx}`);
    params.push(commandName);
    paramIdx++;
  }
  if (serverKey) {
    conditions.push(`server_key=$${paramIdx}`);
    params.push(serverKey);
    paramIdx++;
  }

  let rows: any[] = [];
  try {
    const [result] = await db.execute(
      `SELECT created_at, discord_id, command_name, server_key, query_text, display_name, username
       FROM command_logs
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT $${paramIdx}`,
      [...params, limit]
    );
    rows = result as any[];
  } catch (err: any) {
    if (err?.code !== "42703" && String(err?.code || "") !== "ER_BAD_FIELD_ERROR") throw err;
    // Fallback for legacy schema
    const legacyFetchLimit = Math.max(limit, 100);
    const [legacyRows] = await db.execute(
      `SELECT created_at, discord_id, command_name, detail
       FROM command_logs
       WHERE guild_id=$1
       ORDER BY created_at DESC
       LIMIT $2`,
      [interaction.guildId, legacyFetchLimit]
    );
    rows = (legacyRows as any[]).map((row) => ({
      ...row,
      server_key: "-",
      query_text: String(row.detail || "-"),
      display_name: row.discord_id,
      username: row.discord_id,
    }));
    if (userInput) {
      const needle = userInput.toLowerCase();
      if (/^\d{5,20}$/.test(userInput)) {
        rows = rows.filter((row) => String(row.discord_id || "") === userInput);
      } else {
        rows = rows.filter((row) =>
          String(row.query_text || "").toLowerCase().includes(needle)
        );
      }
    }
    rows = rows.slice(0, limit);
  }

  if (!rows.length) {
    return interaction.reply({ content: "X Belum ada command log.", flags: 64 });
  }

  const lines = rows.map((row) => buildLine(row));
  let body = lines.join("\n");
  if (body.length > 3800) body = `${body.slice(0, 3790)}\n...`;

  return interaction.reply({
    embeds: [
      {
        color: 0x3498db,
        title: "Command Logs",
        description: `\`\`\`\n${body}\n\`\`\``,
        footer: { text: `${AUTHOR_NAME} | ${formatFooterTimeWIB()}` },
      },
    ],
    flags: 64,
  });
}
