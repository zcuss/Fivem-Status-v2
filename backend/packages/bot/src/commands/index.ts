// ============================================================
// Slash commands registry
// ============================================================

import { SlashCommandBuilder } from "discord.js";
import { fetchPlayers } from "../services/server.js";
import { db } from "@fivem/db";

interface Command {
  data: any;
  execute: (interaction: any, instance: any) => Promise<void>;
}

const commands = new Map<string, Command>();

// ========================= /find =========================
commands.set("find", {
  data: new SlashCommandBuilder()
    .setName("find")
    .setDescription("Find a player on a FiveM server")
    .addStringOption((opt) =>
      opt.setName("server").setDescription("Server key").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("query").setDescription("Player name or ID").setRequired(true)
    ),
  execute: async (interaction, instance) => {
    await interaction.deferReply();
    const server = interaction.options.getString("server");
    const query = interaction.options.getString("query");

    const players = await fetchPlayers(server);
    const found = players.find(
      (p: any) =>
        String(p.name || "").toLowerCase().includes(query.toLowerCase()) ||
        String(p.id) === query
    );

    if (!found) {
      await interaction.editReply(`❌ Player "${query}" not found on \`${server}\``);
      return;
    }

    await interaction.editReply({
      embeds: [{
        title: `🔍 ${found.name}`,
        description: `**ID:** ${found.id}\n**Server:** ${server}`,
        color: 0x5865f2,
        timestamp: new Date().toISOString(),
      }],
    });
  },
});

// ========================= /playtime =========================
commands.set("playtime", {
  data: new SlashCommandBuilder()
    .setName("playtime")
    .setDescription("Check playtime for a player")
    .addStringOption((opt) =>
      opt.setName("server").setDescription("Server key").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("player").setDescription("Player name").setRequired(true)
    ),
  execute: async (interaction, instance) => {
    await interaction.deferReply();
    const server = interaction.options.getString("server");
    const playerName = interaction.options.getString("player");
    const { normalizeName, playDateWIB } = await import("@fivem/shared");

    const key = normalizeName(playerName);
    const playDate = playDateWIB();

    try {
      const [rows] = await db.execute(
        `SELECT h.playtime_seconds, p.latest_name
         FROM playtime_daily_hot h
         JOIN playtime_players p ON p.id = h.player_ref
         WHERE h.server_key = ? AND p.player_key = ? AND h.play_date = ?`,
        [server, key, playDate]
      );

      if (!(rows as any[]).length) {
        await interaction.editReply(`❌ No playtime found for "${playerName}" on \`${server}\` today`);
        return;
      }

      const row = (rows as any[])[0];
      const seconds = Number(row.playtime_seconds);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);

      await interaction.editReply({
        embeds: [{
          title: `⏱️ ${row.latest_name}`,
          description: `**Today:** ${h}h ${m}m\n**Server:** ${server}`,
          color: 0x57f287,
        }],
      });
    } catch (err: any) {
      await interaction.editReply(`❌ DB error: ${err.message}`);
    }
  },
});

// ========================= /listserver =========================
commands.set("listserver", {
  data: new SlashCommandBuilder()
    .setName("listserver")
    .setDescription("List all configured servers"),
  execute: async (interaction, instance) => {
    await interaction.deferReply();
    try {
      const [rows] = await db.execute("SELECT server_key, server_code FROM server_configs");
      const servers = rows as any[];
      if (!servers.length) {
        await interaction.editReply("No servers configured.");
        return;
      }
      const list = servers.map((s) => `\`${s.server_key}\` → \`${s.server_code}\``).join("\n");
      await interaction.editReply({ embeds: [{ title: "📋 Servers", description: list, color: 0x5865f2 }] });
    } catch (err: any) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  },
});

// ========================= /profile =========================
commands.set("profile", {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your profile"),
  execute: async (interaction, instance) => {
    await interaction.deferReply();
    const discordId = interaction.user.id;
    try {
      const [rows] = await db.execute(
        "SELECT * FROM user_roles WHERE discord_id = ?",
        [discordId]
      );
      const user = (rows as any[])[0];
      if (!user) {
        await interaction.editReply("❌ No profile found. Use a command first.");
        return;
      }
      await interaction.editReply({
        embeds: [{
          title: `👤 ${user.discord_name || interaction.user.username}`,
          fields: [
            { name: "Role", value: user.role, inline: true },
            { name: "Max Auto", value: String(user.max_auto), inline: true },
          ],
          color: 0xfee75c,
        }],
      });
    } catch (err: any) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  },
});

// ========================= /botlist =========================
commands.set("botlist", {
  data: new SlashCommandBuilder()
    .setName("botlist")
    .setDescription("List all bot instances (admin only)"),
  execute: async (interaction, instance) => {
    await interaction.deferReply();
    const { parseDiscordIdList } = await import("@fivem/shared");
    const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
    if (!adminIds.includes(Number(interaction.user.id))) {
      await interaction.editReply("❌ Admin only.");
      return;
    }
    try {
      const [rows] = await db.execute("SELECT id, name, status, enabled, cluster_id, features FROM bot_configs");
      const bots = rows as any[];
      if (!bots.length) {
        await interaction.editReply("No bots configured.");
        return;
      }
      const list = bots.map((b) =>
        `\`${b.name}\` (id=${b.id}) — ${b.status} | cluster=${b.clusterId || "default"} | features=${b.features}`
      ).join("\n");
      await interaction.editReply({ embeds: [{ title: "🤖 Bots", description: list, color: 0xeb459e }] });
    } catch (err: any) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  },
});

export { commands };
