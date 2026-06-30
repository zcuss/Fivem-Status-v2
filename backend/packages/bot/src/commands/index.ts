// ============================================================
// Slash commands registry + setup button/modal handlers
// ============================================================

import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
  EmbedBuilder,
} from "discord.js";
import { fetchPlayers } from "../services/server.js";
import { db } from "@fivem/db";
import { botEmbed, successEmbed, errorEmbed } from "./embeds.js";
import {
  normalizeName,
  normalizeSearch,
  playDateWIB,
  calcWidths,
  formatPlayerLine,
  formatDuration,
  formatFooterTimeWIB,
  AUTHOR_NAME,
  DEFAULT_USER_LOGO,
  parseDiscordIdList,
} from "@fivem/shared";
import { getSteamRanksByHexes, getUserAutoLimit, getServerCode } from "./helpers.js";

const INTERVAL = Number(process.env.BOT_INTERVAL_MS) || 10000;

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
      opt.setName("nama").setDescription("Player name or keyword").setRequired(true)
    ),
  execute: async (interaction, instance) => {
    const server = interaction.options.getString("server")?.toLowerCase();
    const keyword = interaction.options.getString("nama") || "";
    const serverCode = server ? await getServerCode(server) : null;

    if (!server || !serverCode) {
      return interaction.reply({
        content: "❌ Server tidak ditemukan",
        flags: 64,
      });
    }

    if (!keyword.trim()) {
      return interaction.reply({
        content: "❌ Keyword tidak valid",
        flags: 64,
      });
    }

    const keyNorm = normalizeSearch(keyword);
    if (!keyNorm) {
      return interaction.reply({
        content: "❌ Keyword tidak valid",
        flags: 64,
      });
    }
    const hasTrailingSpace = /\s$/.test(keyword);
    const nameQuery = hasTrailingSpace ? `${keyNorm} ` : keyNorm;

    const players = await fetchPlayers(serverCode);
    const steamMap = new Map();

    const allKeyList = Array.from(new Set(players.map((p: any) => normalizeName(p.name))));
    if (allKeyList.length) {
      const [steamRows] = await db.execute(
        `SELECT player_key, steam_hex, last_seen
         FROM steam_players
         WHERE player_key = ANY($1)
         ORDER BY last_seen DESC`,
        [allKeyList]
      );
      for (const row of steamRows as any[]) {
        if (!steamMap.has(row.player_key)) {
          steamMap.set(row.player_key, row.steam_hex);
        }
      }
    }

    // Get steam ranks for this user
    const rankMap = await getSteamRanksByHexes(
      Array.from(steamMap.values()),
      interaction.user.id
    );

    // Match keyword by player name OR steam hex OR mapped rank label
    const found = players.filter((p: any) => {
      const nameMatch = normalizeSearch(p.name).includes(nameQuery);
      if (nameMatch) return true;

      const key = normalizeName(p.name);
      const steamHex = steamMap.get(key) || "";
      const steamMatch = normalizeSearch(steamHex).includes(keyNorm);
      if (steamMatch) return true;

      const rank = String(rankMap.get(String(steamHex || "").toLowerCase()) || "");
      return normalizeSearch(rank).includes(keyNorm);
    });

    if (!found.length) {
      return interaction.reply({
        content: "❌ Player tidak ditemukan",
        flags: 64,
      });
    }

    const today = playDateWIB();
    const rows: any[] = [];
    const playtimeMap = new Map();
    const foundKeyList = Array.from(new Set(found.map((p: any) => normalizeName(p.name))));

    if (foundKeyList.length) {
      const [playtimeRows] = await db.execute(
        `SELECT p.player_key, h.playtime_seconds
         FROM playtime_daily_hot h
         JOIN playtime_players p ON p.id = h.player_ref
         WHERE h.server_key=$1 AND h.play_date=$2 AND p.player_key = ANY($3)`,
        [server, today, foundKeyList]
      );
      for (const row of playtimeRows as any[]) {
        playtimeMap.set(row.player_key, Number(row.playtime_seconds) || 0);
      }
    }

    for (const p of found) {
      const key = normalizeName(p.name);
      const steamHex = steamMap.get(key) || "";
      const rank = rankMap.get(String(steamHex || "").toLowerCase()) || "";
      const rankTag = rank ? ` [${rank.toUpperCase()}]` : "";
      const displayName = steamHex
        ? `${p.name} (${steamHex})${rankTag}`
        : `${p.name}${rankTag}`;

      rows.push({
        id: p.id,
        name: displayName,
        ping: p.ping,
        time: formatDuration(playtimeMap.get(key) || 0),
      });
    }

    const widths = calcWidths(rows);
    const lines = rows.map((r) => formatPlayerLine(r, widths));
    const refreshSeconds = Math.max(1, Math.round(INTERVAL / 1000));
    const thumbnailUrl = process.env.FIND_THUMBNAIL_URL || DEFAULT_USER_LOGO || null;

    const embed = new EmbedBuilder()
      .setAuthor({ name: "ZCUS BOT | FINDER" })
      .setTitle(`FIND (${keyword.trim().toUpperCase()})`)
      .setDescription(`\`\`\`\n${lines.join("\n")}\n\`\`\``)
      .setColor(0xffa500)
      .addFields(
        { name: "Server", value: `\`\`\`\n${server.toUpperCase()}\n\`\`\``, inline: true },
        { name: "Ditemukan", value: `\`\`\`\n${found.length}\n\`\`\``, inline: true },
        { name: "Player Online", value: `\`\`\`\n${players.length}\n\`\`\``, inline: true }
      )
      .setFooter({
        text: `${AUTHOR_NAME} | ${formatFooterTimeWIB()} | Refreshing Every ${refreshSeconds}s`,
      })
      .setTimestamp(new Date())
      .setThumbnail(thumbnailUrl);

    return interaction.reply({ embeds: [embed] });
  },
});

// ========================= /listserver =========================
commands.set("listserver", {
  data: new SlashCommandBuilder()
    .setName("listserver")
    .setDescription("List all configured servers"),
  execute: async (interaction, instance) => {
    const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
    if (!adminIds.includes(Number(interaction.user.id))) {
      return interaction.reply({ content: "❌ Kamu tidak punya akses", flags: 64 });
    }

    try {
      const [rows] = await db.execute("SELECT server_key, server_code FROM server_configs ORDER BY server_key ASC");
      const servers = rows as any[];
      if (!servers.length) {
        return interaction.reply({ content: "Tidak ada server yang terdaftar", flags: 64 });
      }
      const list = servers
        .map((row: any, idx: number) => `${idx + 1}. ${row.server_key} -> ${row.server_code}`)
        .join("\n");

      return interaction.reply({
        embeds: [{
          color: 0x3498db,
          title: "Server List",
          description: `\`\`\`\n${list}\n\`\`\``,
        }],
        flags: 64,
      });
    } catch (err: any) {
      return interaction.reply({ content: `❌ Error: ${err.message}`, flags: 64 });
    }
  },
});

// ========================= /profile =========================
commands.set("profile", {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your profile"),
  execute: async (interaction, instance) => {
    const discordId = interaction.user.id;
    const { role, max, expires } = await getUserAutoLimit(discordId);

    const [[cnt]]: any[] = await db.execute(
      "SELECT COUNT(*) AS total FROM auto_find WHERE discord_id=$1",
      [discordId]
    );

    const roleMeta: Record<string, { icon: string; label: string; color: number }> = {
      dev: { icon: "🛠️", label: "Developer", color: 0xe74c3c },
      custom: { icon: "🎯", label: "Custom", color: 0xf1c40f },
      premium: { icon: "💎", label: "Premium", color: 0x3498db },
      donator: { icon: "🔥", label: "Donator", color: 0xe67e22 },
      user: { icon: "👤", label: "User", color: 0x95a5a6 },
    };

    const meta = roleMeta[role] || roleMeta.user;

    const percent = max === Infinity ? 1 : (Number(cnt?.total) || 0) / max;
    const filled = Math.min(10, Math.round(percent * 10));
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("profile_list_auto")
        .setLabel("📋 List Auto")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [{
        color: meta.color,
        title: `${meta.icon} User Profile`,
        thumbnail: {
          url: interaction.user.displayAvatarURL({ dynamic: true }),
        },
        fields: [
          {
            name: "🆔 Account",
            value: `**${interaction.user.username}**\n${interaction.user.id}`,
          },
          {
            name: "🏷️ Role",
            value: meta.label,
            inline: true,
          },
          {
            name: "⏱️ Expiry",
            value: expires
              ? `<t:${Math.floor(new Date(expires).getTime() / 1000)}:R>`
              : "—",
            inline: true,
          },
          {
            name: "⚙️ Auto Find Usage",
            value: `\`${bar}\`\n${Number(cnt?.total) || 0} / ${max === Infinity ? "∞" : max}`,
          },
        ],
        footer: { text: "Auto Find System • BOT FIVEM" },
        timestamp: new Date(),
      }],
      components: [row],
      flags: 64,
    });
  },
});

// ========================= /botlist =========================
commands.set("botlist", {
  data: new SlashCommandBuilder()
    .setName("botlist")
    .setDescription("List all bot instances (admin only)"),
  execute: async (interaction, instance) => {
    const adminIds = parseDiscordIdList(process.env.ADMIN_IDS);
    if (!adminIds.includes(Number(interaction.user.id))) {
      return interaction.reply({ content: "❌ Admin only", flags: 64 });
    }
    try {
      const [rows] = await db.execute("SELECT id, name, status, enabled, cluster_id, features FROM bot_configs");
      const bots = rows as any[];
      if (!bots.length) {
        return interaction.reply({ content: "Belum ada bot yang dikonfigurasi", flags: 64 });
      }
      const list = bots.map((b) => `\`${b.name}\` — ${b.status} | cluster=${b.cluster_id || "default"}`).join("\n");
      return interaction.reply({
        embeds: [{
          color: 0xeb459e,
          title: "🤖 Daftar Bot",
          description: `\`\`\`\n${list}\n\`\`\``,
        }],
        flags: 64,
      });
    } catch (err: any) {
      return interaction.reply({ content: `❌ Error: ${err.message}`, flags: 64 });
    }
  },
});

// ========================= /playtime =========================
import { data as playtimeData, execute as playtimeExecute, handleButton as playtimeHandleButton, handleSelect as playtimeHandleSelect } from "./playtime.js";
commands.set("playtime", { data: playtimeData, execute: playtimeExecute });

// ========================= /spy =========================
import { data as spyData, execute as spyExecute } from "./spy.js";
commands.set("spy", { data: spyData, execute: spyExecute });

// ========================= /topplaytime =========================
import { data as topplaytimeData, execute as topplaytimeExecute } from "./topplaytime.js";
commands.set("topplaytime", { data: topplaytimeData, execute: topplaytimeExecute });

// ========================= /steamhex =========================
import { data as steamhexData, execute as steamhexExecute, handleButton as steamhexHandleButton } from "./steamhex.js";
commands.set("steamhex", { data: steamhexData, execute: steamhexExecute });

// ========================= /setrank =========================
import { data as setrankData, execute as setrankExecute } from "./setrank.js";
commands.set("setrank", { data: setrankData, execute: setrankExecute });

// ========================= /delrank =========================
import { data as delrankData, execute as delrankExecute } from "./delrank.js";
commands.set("delrank", { data: delrankData, execute: delrankExecute });

// ========================= /setauto =========================
import { data as setautoData, execute as setautoExecute } from "./setauto.js";
commands.set("setauto", { data: setautoData, execute: setautoExecute });

// ========================= /delauto =========================
import { data as delautoData, execute as delautoExecute } from "./delauto.js";
commands.set("delauto", { data: delautoData, execute: delautoExecute });

// ========================= /addserver =========================
import { data as addserverData, execute as addserverExecute } from "./addserver.js";
commands.set("addserver", { data: addserverData, execute: addserverExecute });

// ========================= /editserver =========================
import { data as editserverData, execute as editserverExecute } from "./editserver.js";
commands.set("editserver", { data: editserverData, execute: editserverExecute });

// ========================= /delserver =========================
import { data as delserverData, execute as delserverExecute } from "./delserver.js";
commands.set("delserver", { data: delserverData, execute: delserverExecute });

// ========================= /setephemeral =========================
import { data as setephemeralData, execute as setephemeralExecute } from "./setephemeral.js";
commands.set("setephemeral", { data: setephemeralData, execute: setephemeralExecute });

// ========================= /setvoice =========================
import { data as setvoiceData, execute as setvoiceExecute } from "./setvoice.js";
commands.set("setvoice", { data: setvoiceData, execute: setvoiceExecute });

// ========================= /commandlogs =========================
import { data as commandlogsData, execute as commandlogsExecute } from "./commandlogs.js";
commands.set("commandlogs", { data: commandlogsData, execute: commandlogsExecute });

// ========================= /setup =========================
import { data as setupData, execute as setupExecute } from "./setup.js";
commands.set("setup", { data: setupData, execute: setupExecute });

// ========================= /settings =========================
import { data as settingsData, execute as settingsExecute } from "./settings.js";
commands.set("settings", { data: settingsData, execute: settingsExecute });

// ============================================================
// Button interaction handler — setup menu
// ============================================================

const SETUP_PREFIX = "setup:";

// Which buttons need modals (input required)
const MODAL_BUTTONS: Record<string, { title: string; fields: { id: string; label: string; placeholder: string; style?: any; required?: boolean; maxLength?: number }[] }> = {
  find: {
    title: "🔍 Find Player",
    fields: [
      { id: "server", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "nama", label: "Nama Player", placeholder: "contoh: ems andica", required: true },
    ],
  },
  playtime: {
    title: "⏱️ Playtime",
    fields: [
      { id: "server", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "player", label: "Nama Player", placeholder: "contoh: ems andica", required: true },
    ],
  },
  steamhex: {
    title: "🏷️ Steam Hex Search",
    fields: [
      { id: "nama", label: "Nama / Steam Hex", placeholder: "contoh: John atau steam:11000...", required: true },
    ],
  },
  topplaytime: {
    title: "🏆 Top Playtime",
    fields: [
      { id: "keyword", label: "Keyword", placeholder: "contoh: sheriff / medic", required: true },
      { id: "periode", label: "Periode (minggu/bulan)", placeholder: "minggu atau bulan", required: true },
      { id: "server", label: "Server Key (opsional)", placeholder: "kosong = global", required: false },
      { id: "limit", label: "Jumlah Top (1-20)", placeholder: "default 10", required: false },
    ],
  },
  setauto: {
    title: "📡 Set Auto Find",
    fields: [
      { id: "server", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "keyword", label: "Keyword Player", placeholder: "contoh: ems", required: true },
    ],
  },
  spy: {
    title: "🕵️ Spy Player",
    fields: [
      { id: "server", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "id", label: "Player ID", placeholder: "contoh: 1997", required: true },
    ],
  },
  setrank: {
    title: "🏅 Set Rank",
    fields: [
      { id: "steamhex", label: "Steam Hex", placeholder: "contoh: steam:110000117145eb3", required: true },
      { id: "rank", label: "Rank Label", placeholder: "contoh: admin / mod / helper", required: true },
    ],
  },
  delrank: {
    title: "❌ Hapus Rank",
    fields: [
      { id: "steamhex", label: "Steam Hex", placeholder: "contoh: steam:110000117145eb3", required: true },
    ],
  },
  addserver: {
    title: "➕ Tambah Server",
    fields: [
      { id: "id", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "kodeserver", label: "Kode Server", placeholder: "contoh: 192.168.1.1:30120", required: true },
    ],
  },
  editserver: {
    title: "✏️ Edit Server",
    fields: [
      { id: "id", label: "Server Key", placeholder: "contoh: idp", required: true },
      { id: "kodeserver", label: "Kode Server Baru", placeholder: "contoh: 192.168.1.2:30120", required: true },
    ],
  },
  delserver: {
    title: "🗑️ Hapus Server",
    fields: [
      { id: "id", label: "Server Key", placeholder: "contoh: idp", required: true },
    ],
  },
  delauto: {
    title: "❌ Hapus Auto Find",
    fields: [
      { id: "id", label: "ID Auto Find", placeholder: "contoh: 1", required: true },
    ],
  },
};

// Commands that execute directly without modal (no input needed)
const DIRECT_BUTTONS = ["listserver", "profile", "botlist", "commandlogs", "settings"];

export async function handleSetupButton(interaction: any): Promise<boolean> {
  if (!interaction.isButton()) return false;
  const customId = interaction.customId;
  if (!customId.startsWith(SETUP_PREFIX)) return false;

  const action = customId.slice(SETUP_PREFIX.length);

  if (action === "back") {
    await interaction.update({ content: "↩️ Kembali ke menu utama", components: [], embeds: [] });
    return true;
  }

  const modalConfig = MODAL_BUTTONS[action];
  if (modalConfig) {
    const modal = new ModalBuilder()
      .setCustomId(`setup:${action}`)
      .setTitle(modalConfig.title);

    for (const field of modalConfig.fields) {
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setPlaceholder(field.placeholder || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(field.required ?? false)
        )
      );
    }

    await interaction.showModal(modal);
    return true;
  }

  if (DIRECT_BUTTONS.includes(action)) {
    const cmd = commands.get(action);
    if (cmd && cmd.execute) {
      await cmd.execute(interaction, {});
      return true;
    }
  }

  return false;
}

export async function handleSetupModal(interaction: any): Promise<boolean> {
  if (!interaction.isModalSubmit()) return false;
  const customId = interaction.customId;
  if (!customId.startsWith(SETUP_PREFIX)) return false;

  const action = customId.slice(SETUP_PREFIX.length);
  await interaction.deferReply({ flags: 64 });

  const fields = interaction.fields;
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields.fields)) {
    data[key] = (value as any).value || "";
  }

  await interaction.editReply({ content: `✅ Setup **${action}** berhasil disimpan.` });
  return true;
}

export async function handleButtonInteraction(interaction: any): Promise<boolean> {
  if (!interaction.isButton()) return false;
  const customId = interaction.customId;

  // Playtime pagination buttons
  const { handleButton: playtimeHandleButton } = await import("./playtime.js");
  if (playtimeHandleButton) {
    const handled = await playtimeHandleButton(interaction);
    if (handled) return true;
  }

  // Profile auto find list button
  if (customId === "profile_list_auto") {
    await interaction.deferReply({ flags: 64 });
    const discordId = interaction.user.id;
    const [rows]: any[] = await db.execute(
      `SELECT id, server_key, keyword, channel_id FROM auto_find WHERE discord_id=$1 ORDER BY id ASC`,
      [discordId]
    );
    if (!rows.length) {
      return interaction.editReply({ content: "❌ Kamu belum punya Auto Find aktif" });
    }
    const list = rows.map((r: any) => `#${r.id} | **${r.server_key.toUpperCase()}** > \`${r.keyword}\``).join("\n");
    return interaction.editReply({
      embeds: [{
        color: 0x2ecc71,
        title: "📋 Auto Find List",
        description: list,
        footer: { text: "Gunakan /delauto id:<id> untuk menghapus" },
      }],
    });
  }

  return false;
}

export async function handleSelectMenuInteraction(interaction: any): Promise<boolean> {
  if (!interaction.isStringSelectMenu()) return false;
  const customId = interaction.customId;

  // Playtime select menu
  const { handleSelect: playtimeHandleSelect } = await import("./playtime.js");
  if (playtimeHandleSelect) {
    const handled = await playtimeHandleSelect(interaction);
    if (handled) return true;
  }

  return false;
}

export { commands };
