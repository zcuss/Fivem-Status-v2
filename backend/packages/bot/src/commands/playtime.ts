// ============================================================
// /playtime — Check playtime with select menu + pagination
// Ported from ~/Fivem-Status/src/commands/playtime.ts
// Supports: global/server scope, multi-candidate select menu,
//           result pagination, UNION ALL hot+archive
// ============================================================

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { db } from "@fivem/db";

// ============================================================
// Constants
// ============================================================

const SESSION_TTL_MS = 15 * 60 * 1000;
const PAGE_SIZE_RESULT = 7;
const PAGE_SIZE_SELECT = 25;
const BUTTON_PREFIX = "playtime_btn:";
const RESULT_PREFIX = "playtime_res:";
const SELECT_PREFIX = "playtime_sel:";

const sessionStore = new Map<string, any>();
const resultStore = new Map<string, any>();

// ============================================================
// Session management
// ============================================================

function cleanupSessions(now = Date.now()) {
  for (const [key, value] of sessionStore.entries()) {
    if (now - value.createdAt > SESSION_TTL_MS) sessionStore.delete(key);
  }
  for (const [key, value] of resultStore.entries()) {
    if (now - value.createdAt > SESSION_TTL_MS) resultStore.delete(key);
  }
}

function createSession(userId: string, candidates: any[], meta: any) {
  cleanupSessions();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStore.set(token, { userId, candidates, meta, createdAt: Date.now() });
  return token;
}

function createResultSession(userId: string, rows: any[], meta: any) {
  cleanupSessions();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  resultStore.set(token, { userId, rows, meta, createdAt: Date.now() });
  return token;
}

// ============================================================
// Helpers
// ============================================================

function formatDateIndo(dateInput: any): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "??/??/????";
  const utc7 = new Date(d.getTime() + 7 * 3600 * 1000);
  const dd = String(utc7.getUTCDate()).padStart(2, "0");
  const mm = String(utc7.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = utc7.getUTCFullYear();
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hari = dayNames[utc7.getUTCDay()];
  return `${hari}, ${dd}/${mm}/${yyyy}`;
}

function formatDateIndoAligned(dateInput: any): string {
  const raw = formatDateIndo(dateInput);
  const commaIndex = raw.indexOf(",");
  if (commaIndex === -1) return raw;
  const day = raw.slice(0, commaIndex);
  const rest = raw.slice(commaIndex + 1).trimStart();
  const pad = " ".repeat(Math.max(1, 7 - day.length));
  return `${day},${pad}${rest}`;
}

function normalizeSearch(str: string): string {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatLines(rows: any[], showServerTag = false): string[] {
  const idWidth = Math.max(4, ...rows.map((r) => String(r.player_id || "").length));
  return rows.map((r) => {
    const idText = String(r.player_id ?? "").padStart(idWidth, " ");
    const dateText = formatDateIndoAligned(r.play_date);
    const name = r.player_name || "Unknown";
    const time = formatDuration(r.playtime_seconds || 0);
    const serverTag =
      showServerTag && r.server_key
        ? `[${String(r.server_key || "").toUpperCase()}] `
        : "";
    return `${dateText} ${serverTag}[${idText}] ${name}  ${time}`;
  });
}

function scopeTitle(meta: any, playerName: string) {
  if (meta.scope === "global") return `Playtime (Global) - ${playerName || "Player"}`;
  return `Playtime (Server: ${(meta.serverKey || "-").toUpperCase()}) - ${playerName || "Player"}`;
}

function buildPlaytimePage(rows: any[], page: number, showServerTag = false) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE_RESULT));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const slice = rows.slice(safePage * PAGE_SIZE_RESULT, safePage * PAGE_SIZE_RESULT + PAGE_SIZE_RESULT);
  const lines = formatLines(slice, showServerTag);
  let body = lines.join("\n");
  if (body.length > 3800) body = body.slice(0, 3790) + "\n...";
  return { body, totalPages, page: safePage };
}

// ============================================================
// DB queries
// ============================================================

async function getServersMap(): Promise<Record<string, string>> {
  try {
    const [rows]: any = await db.execute("SELECT server_key, server_code FROM server_configs");
    const map: Record<string, string> = {};
    for (const row of rows) map[String(row.server_key || "").toLowerCase()] = String(row.server_code || "");
    return map;
  } catch {
    return {};
  }
}

async function resolvePlaytimeContext(rawServer: string | null) {
  const servers = await getServersMap();
  const keys = Object.keys(servers)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  const requested = String(rawServer || "").trim().toLowerCase();
  if (requested) {
    if (!keys.length) return { scope: "server" as const, serverKey: null, error: "Belum ada server terdaftar." };
    if (!servers[requested]) return { scope: "server" as const, serverKey: null, error: "Server tidak ditemukan." };
    return { scope: "server" as const, serverKey: requested };
  }
  return { scope: "global" as const, serverKey: null };
}

async function resolvePlayerRefByKey(playerKey: string) {
  const [[row]]: any = await db.execute(
    `SELECT id, latest_name, latest_player_id
     FROM playtime_players
     WHERE player_key=$1
     LIMIT 1`,
    [playerKey]
  );
  return row || null;
}

async function fetchPlaytimeByKey(playerKey: string, context: any) {
  const player = await resolvePlayerRefByKey(playerKey);
  if (!player?.id) return [];
  let rows: any[] = [];
  if (context.scope === "server") {
    const [serverRows]: any = await db.execute(
      `SELECT play_date, $1 AS server_key,
              SUM(playtime_seconds) AS playtime_seconds,
              MAX(last_seen) AS last_seen
       FROM (
         SELECT play_date, playtime_seconds, last_seen
         FROM playtime_daily_hot WHERE player_ref=$2 AND server_key=$3
         UNION ALL
         SELECT play_date, playtime_seconds, last_seen
         FROM playtime_daily_archive WHERE player_ref=$4 AND server_key=$5
       ) t
       GROUP BY play_date
       ORDER BY play_date DESC`,
      [context.serverKey, player.id, context.serverKey, player.id, context.serverKey]
    );
    rows = serverRows;
  } else {
    const [globalRows]: any = await db.execute(
      `SELECT play_date, server_key,
              SUM(playtime_seconds) AS playtime_seconds,
              MAX(last_seen) AS last_seen
       FROM (
         SELECT play_date, server_key, playtime_seconds, last_seen
         FROM playtime_daily_hot WHERE player_ref=$1
         UNION ALL
         SELECT play_date, server_key, playtime_seconds, last_seen
         FROM playtime_daily_archive WHERE player_ref=$2
       ) t
       GROUP BY play_date, server_key
       ORDER BY play_date DESC, server_key ASC`,
      [player.id, player.id]
    );
    rows = globalRows;
  }
  return rows.map((row: any) => ({
    ...row,
    player_id: player.latest_player_id,
    player_name: player.latest_name,
  }));
}

async function fetchCandidates(input: string, context: any) {
  const isNumeric = /^\d+$/.test(input);
  const search = normalizeSearch(input);
  const like = `%${search}%`;

  if (context.scope === "server") {
    const [rows]: any = await db.execute(
      `SELECT p.player_key,
              p.latest_name AS player_name,
              p.latest_player_id AS player_id,
              $1 AS server_key,
              MAX(t.last_seen) AS last_seen
       FROM (
         SELECT player_ref, last_seen
         FROM playtime_daily_hot WHERE server_key=$2
         UNION ALL
         SELECT player_ref, last_seen
         FROM playtime_daily_archive WHERE server_key=$3
       ) t
       JOIN playtime_players p ON p.id=t.player_ref
       WHERE p.latest_player_id=$4 OR p.latest_name LIKE $5 OR p.player_key LIKE $6
       GROUP BY p.player_key, p.latest_name, p.latest_player_id
       ORDER BY last_seen DESC
       LIMIT 500`,
      [context.serverKey, context.serverKey, context.serverKey,
       isNumeric ? Number(input) : -1, like, like]
    );
    return rows;
  }

  const [rows]: any = await db.execute(
    `SELECT t.server_key,
            p.player_key,
            p.latest_name AS player_name,
            p.latest_player_id AS player_id,
            MAX(t.last_seen) AS last_seen
     FROM (
       SELECT server_key, player_ref, last_seen FROM playtime_daily_hot
       UNION ALL
       SELECT server_key, player_ref, last_seen FROM playtime_daily_archive
     ) t
     JOIN playtime_players p ON p.id=t.player_ref
     WHERE p.latest_player_id=$1 OR p.latest_name LIKE $2 OR p.player_key LIKE $3
     GROUP BY t.server_key, p.player_key, p.latest_name, p.latest_player_id
     ORDER BY last_seen DESC
     LIMIT 500`,
    [isNumeric ? Number(input) : -1, like, like]
  );
  return rows;
}

// ============================================================
// UI builders
// ============================================================

function buildSelectMenu(candidates: any[], sessionToken: string, page: number) {
  const options: any[] = [];
  const offset = page * PAGE_SIZE_SELECT;
  const slice = candidates.slice(offset, offset + PAGE_SIZE_SELECT);

  for (let i = 0; i < slice.length; i++) {
    const idx = offset + i;
    const c = slice[i];
    const serverKey = String(c.server_key || "-").toUpperCase();
    let label = `[${serverKey}] ${c.player_name || c.player_key || "Unknown"}`;
    if (label.length > 100) label = label.slice(0, 97) + "...";
    let desc = c.player_id ? `ID ${c.player_id} | Server ${serverKey}` : `Server ${serverKey}`;
    if (desc && desc.length > 100) desc = desc.slice(0, 100);

    options.push({
      label,
      value: String(idx),
      description: desc || undefined,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${SELECT_PREFIX}${sessionToken}`)
    .setPlaceholder("Pilih nama player")
    .addOptions(options);

  const rows: any[] = [new ActionRowBuilder().addComponents(menu)];
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE_SELECT));
  return { rows, totalPages, page };
}

function buildNavButtons(sessionToken: string, page: number, totalPages: number, prefix = BUTTON_PREFIX) {
  if (totalPages <= 1) return null;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}${sessionToken}:${Math.max(page - 1, 0)}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`${prefix}${sessionToken}:${Math.min(page + 1, totalPages - 1)}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

function renderCandidatePage(entry: any, sessionToken: string, page: number) {
  const { rows, totalPages } = buildSelectMenu(entry.candidates, sessionToken, page);
  const nav = buildNavButtons(sessionToken, page, totalPages);
  if (nav) rows.push(nav);
  const scopeLabel =
    entry.meta.scope === "global"
      ? "global, pilih server di list"
      : `server:${String(entry.meta.serverKey || "-").toUpperCase()}`;
  return {
    content: `Pilih nama player (scope ${scopeLabel}, page ${page + 1}/${totalPages}):`,
    components: rows,
    embeds: [],
  };
}

// ============================================================
// Command definition
// ============================================================

export const data = new SlashCommandBuilder()
  .setName("playtime")
  .setDescription("Check playtime for a player")
  .addStringOption((opt) =>
    opt.setName("nama").setDescription("Nama player atau ID").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("server").setDescription("Server key (kosongkan untuk global)").setRequired(false)
  );

// ============================================================
// Execute
// ============================================================

export async function execute(interaction: any) {
  const input = interaction.options.getString("nama")?.trim();
  const serverInput = interaction.options.getString("server");

  if (!input) {
    return interaction.reply({ content: "Nama atau ID tidak valid.", flags: 64 });
  }

  const context = await resolvePlaytimeContext(serverInput);
  if ((context as any).error) {
    return interaction.reply({ content: (context as any).error, flags: 64 });
  }

  const candidatesRaw = await fetchCandidates(input, context);
  if (!candidatesRaw.length) {
    return interaction.reply({ content: "Player tidak ditemukan.", flags: 64 });
  }

  const candidates = candidatesRaw.sort((a: any, b: any) => {
    const an = normalizeSearch(a.player_name || a.player_key || "");
    const bn = normalizeSearch(b.player_name || b.player_key || "");
    const byName = an.localeCompare(bn);
    if (byName !== 0) return byName;
    return String(a.server_key || "").localeCompare(String(b.server_key || ""));
  });

  // Single match — show result directly
  if (candidates.length === 1) {
    const single = candidates[0];
    const nextContext =
      context.scope === "global" && single?.server_key
        ? { scope: "server" as const, serverKey: String(single.server_key || "").toLowerCase() }
        : context;

    const rows = await fetchPlaytimeByKey(single.player_key, nextContext);
    if (!rows.length) {
      return interaction.reply({ content: "Data playtime tidak ditemukan.", flags: 64 });
    }

    const lines = formatLines(rows, nextContext.scope === "global");
    let body = lines.join("\n");
    if (body.length > 3800) body = body.slice(0, 3790) + "\n...";
    const title = scopeTitle(nextContext, rows[0].player_name || "Player");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(title)
          .setDescription(`\`\`\`\n${body}\n\`\`\``),
      ],
    });
  }

  // Multiple matches — show select menu
  const sessionToken = createSession(interaction.user.id, candidates, context);
  const { rows, totalPages } = buildSelectMenu(candidates, sessionToken, 0);
  const nav = buildNavButtons(sessionToken, 0, totalPages);
  if (nav) rows.push(nav);
  const scopeLabel =
    context.scope === "global"
      ? "global, pilih server di list"
      : `server:${String(context.serverKey || "-").toUpperCase()}`;

  return interaction.reply({
    content: `Pilih nama player (scope ${scopeLabel}, page 1/${totalPages}):`,
    components: rows,
    flags: 64,
  });
}

// ============================================================
// Button handler (candidate pagination + result pagination)
// ============================================================

export async function handleButton(interaction: any) {
  const customId = interaction.customId || "";
  if (!customId.startsWith(BUTTON_PREFIX) && !customId.startsWith(RESULT_PREFIX)) return false;

  await interaction.deferUpdate();
  cleanupSessions();

  // Result pagination
  if (customId.startsWith(RESULT_PREFIX)) {
    const payload = customId.slice(RESULT_PREFIX.length);
    const [resultToken, pageRaw] = payload.split(":");
    const page = Number(pageRaw);
    const entry = resultStore.get(resultToken);
    if (!entry || entry.userId !== interaction.user.id || !Number.isFinite(page)) {
      return interaction.editReply({ content: "Request sudah kadaluarsa.", components: [] });
    }
    const { body, totalPages, page: safePage } = buildPlaytimePage(entry.rows, page, entry.meta?.scope === "global");
    const resultNav = buildNavButtons(resultToken, safePage, totalPages, RESULT_PREFIX);
    const title = scopeTitle(entry.meta, entry.rows[0]?.player_name || "Player");

    return interaction.editReply({
      content: "",
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(title)
          .setDescription(`\`\`\`\n${body}\n\`\`\``)
          .setFooter({ text: `Page ${safePage + 1}/${totalPages}` }),
      ],
      components: resultNav ? [resultNav] : [],
    });
  }

  // Candidate pagination
  const payload = customId.slice(BUTTON_PREFIX.length);
  const [sessionToken, pageRaw] = payload.split(":");
  const entry = sessionStore.get(sessionToken);
  if (!entry || entry.userId !== interaction.user.id) {
    return interaction.editReply({ content: "Request sudah kadaluarsa.", components: [] });
  }
  const page = Number(pageRaw);
  if (!Number.isFinite(page)) {
    return interaction.editReply({ content: "Request sudah kadaluarsa.", components: [] });
  }
  return interaction.editReply(renderCandidatePage(entry, sessionToken, page));
}

// ============================================================
// Select menu handler (pick player from list)
// ============================================================

export async function handleSelect(interaction: any) {
  const customId = interaction.customId || "";
  if (!customId.startsWith(SELECT_PREFIX)) return false;

  await interaction.deferUpdate();
  cleanupSessions();

  const sessionToken = customId.slice(SELECT_PREFIX.length);
  const entry = sessionStore.get(sessionToken);
  const selectedIndex = Number(interaction.values?.[0]);

  if (
    !entry ||
    entry.userId !== interaction.user.id ||
    !Number.isFinite(selectedIndex) ||
    !entry.candidates[selectedIndex]
  ) {
    return interaction.editReply({ content: "Request sudah kadaluarsa.", components: [] });
  }

  const selected = entry.candidates[selectedIndex];
  const nextContext =
    entry.meta.scope === "global" && selected?.server_key
      ? { scope: "server" as const, serverKey: String(selected.server_key || "").toLowerCase() }
      : entry.meta;

  const rows = await fetchPlaytimeByKey(selected.player_key, nextContext);
  if (!rows.length) {
    return interaction.editReply({ content: "Data playtime tidak ditemukan.", components: [] });
  }

  const resultToken = createResultSession(interaction.user.id, rows, nextContext);
  const { body, totalPages } = buildPlaytimePage(rows, 0, nextContext.scope === "global");
  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${RESULT_PREFIX}${resultToken}:0`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${RESULT_PREFIX}${resultToken}:1`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalPages <= 1)
  );
  const title = scopeTitle(nextContext, rows[0].player_name || "Player");

  return interaction.editReply({
    content: "",
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(title)
        .setDescription(`\`\`\`\n${body}\n\`\`\``)
        .setFooter({ text: `Page 1/${totalPages}` }),
    ],
    components: totalPages > 1 ? [nav] : [],
  });
}
