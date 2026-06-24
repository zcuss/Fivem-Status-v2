// ============================================================
// Bot Manager — multi-bot support
// Manages N bot instances, each with its own discord.js Client
// ============================================================

import { Client, Events, GatewayIntentBits } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList, parseBoolean } from "@fivem/shared";

interface BotInstance {
  id: number;
  name: string;
  client: Client;
  token: string;
  clientId: string;
  features: Set<string>;
  status: "running" | "stopped" | "error";
}

interface BotManagerConfig {
  /** Cluster ID — bots with same clusterId run on same process */
  clusterId?: string;
  /** If true, load bot configs from DB. If false, use env vars (legacy single-bot mode) */
  useDBConfigs?: boolean;
}

const instances = new Map<number, BotInstance>();
let managerConfig: BotManagerConfig = {};

export function getInstances() {
  return instances;
}

export function getInstance(id: number) {
  return instances.get(id);
}

// ============================================================
// Legacy single-bot mode (env vars)
// ============================================================

function getLegacyBotConfig() {
  const token = process.env.DISCORD_TOKEN?.trim();
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  if (!token || !clientId) return null;
  return {
    id: 0,
    name: "default",
    token,
    clientId,
    enabled: true,
    clusterId: "default",
    features: "commands,refresh,voice",
  };
}

// ============================================================
// Load bot configs from DB
// ============================================================

async function loadBotConfigs(clusterId?: string): Promise<any[]> {
  try {
    let sql = "SELECT * FROM bot_configs WHERE enabled = 1";
    const params: any[] = [];
    if (clusterId) {
      sql += " AND (cluster_id = ? OR cluster_id IS NULL)";
      params.push(clusterId);
    }
    const [rows] = await db.execute(sql, params);
    return rows as any[];
  } catch {
    // Table might not exist yet — fallback to legacy
    return [];
  }
}

// ============================================================
// Create a single bot client
// ============================================================

function createBotClient(config: any): BotInstance {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const features = new Set<string>(
    (config.features || "commands,refresh").split(",").map((f: string) => f.trim())
  );

  const instance: BotInstance = {
    id: config.id || 0,
    name: config.name || "default",
    client,
    token: config.token,
    clientId: config.clientId,
    features,
    status: "stopped",
  };

  // Common event handlers
  client.once(Events.ClientReady, async (readyClient) => {
    instance.status = "running";
    console.log(`[BOT:${instance.name}] Logged in as ${readyClient.user.tag} | ${readyClient.guilds.cache.size} guilds`);

    // Register slash commands if feature enabled
    if (features.has("commands")) {
      await registerCommands(client, instance);
    }

    // Start auto-refresh if feature enabled
    if (features.has("refresh")) {
      startAutoRefresh(client, instance);
    }

    // Update DB status
    await updateBotStatus(instance.id, "running");
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleCommand(interaction, instance);
  });

  client.on(Events.Error, (err) => {
    console.error(`[BOT:${instance.name}] Error:`, err.message);
  });

  return instance;
}

// ============================================================
// Command handler
// ============================================================

async function handleCommand(interaction: any, instance: BotInstance) {
  // Command routing — lazy: import from commands/ dir
  const { commands } = await import("./commands/index.js");
  const cmd = commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction, instance);
  } catch (err: any) {
    console.error(`[BOT:${instance.name}] Command error:`, err);
    const reply = { content: "❌ Command error", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}

// ============================================================
// Register slash commands
// ============================================================

async function registerCommands(client: Client, instance: BotInstance) {
  const { REST, Routes } = await import("discord.js");
  const { commands } = await import("./commands/index.js");

  const token = instance.token;
  const clientId = instance.clientId;

  const commandData = Array.from(commands.values()).map((cmd: any) => cmd.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log(`[BOT:${instance.name}] Registered ${commandData.length} commands`);
  } catch (err: any) {
    console.error(`[BOT:${instance.name}] Failed to register commands:`, err.message);
  }
}

// ============================================================
// Auto-refresh (server status embeds)
// ============================================================

async function startAutoRefresh(client: Client, instance: BotInstance) {
  const interval = Number(process.env.BOT_INTERVAL_MS) || 10000;
  const configPath = process.env.SERVER_CONFIG_PATH || "./data/config.json";

  let serverConfig: any = {};
  try {
    const fs = await import("node:fs");
    if (fs.existsSync(configPath)) {
      serverConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {}

  const servers = serverConfig.servers || {};
  const channels = serverConfig.channels || {};

  // Refresh loop
  setInterval(async () => {
    for (const [key, channelId] of Object.entries(channels as Record<string, any>)) {
      try {
        const channel = await client.channels.fetch(channelId.channelId);
        if (!channel?.isTextBased()) continue;
        const message = await channel.messages.fetch(channelId.messageId);
        if (!message) continue;

        // Fetch server data and update embed
        const { fetchServerData } = await import("./services/server.js");
        const serverId = servers[key];
        if (!serverId) continue;

        const data = await fetchServerData(serverId);
        const embed = buildStatusEmbed(data, key);
        await message.edit({ embeds: [embed] }).catch(() => {});
      } catch {}
    }
  }, interval);
}

function buildStatusEmbed(data: any, serverKey: string) {
  const { EmbedBuilder } = require("discord.js");
  const playerCount = data.players?.length || 0;
  return new EmbedBuilder()
    .setTitle(`📊 ${data.name || serverKey}`)
    .setDescription(`Players: ${playerCount}`)
    .setColor(playerCount > 0 ? 0x00ff00 : 0xff0000)
    .setTimestamp();
}

// ============================================================
// Bot status persistence
// ============================================================

async function updateBotStatus(id: number, status: string) {
  if (!id) return;
  try {
    await db.execute(
      "UPDATE bot_configs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id]
    );
  } catch {}
}

// ============================================================
// Public API
// ============================================================

export async function startBotManager(config: BotManagerConfig = {}) {
  managerConfig = config;
  console.log("[BOT-MANAGER] Starting...");

  // Try DB configs first
  const dbConfigs = config.useDBConfigs !== false ? await loadBotConfigs(config.clusterId) : [];

  // Fallback to legacy single-bot mode
  if (dbConfigs.length === 0) {
    const legacy = getLegacyBotConfig();
    if (legacy) {
      console.log("[BOT-MANAGER] Using legacy single-bot mode (env vars)");
      dbConfigs.push(legacy);
    }
  }

  if (dbConfigs.length === 0) {
    console.error("[BOT-MANAGER] No bot configs found. Set DISCORD_TOKEN or add bots to bot_configs table.");
    return;
  }

  console.log(`[BOT-MANAGER] Found ${dbConfigs.length} bot config(s)`);

  for (const cfg of dbConfigs) {
    try {
      const instance = createBotClient(cfg);
      instances.set(instance.id, instance);
      await instance.client.login(instance.token);
      console.log(`[BOT-MANAGER] Started bot: ${instance.name} (id=${instance.id})`);
    } catch (err: any) {
      console.error(`[BOT-MANAGER] Failed to start bot ${cfg.name}:`, err.message);
      await updateBotStatus(cfg.id, "error");
    }
  }
}

export async function stopBotManager() {
  for (const [id, instance] of instances) {
    try {
      instance.client.destroy();
      instance.status = "stopped";
      await updateBotStatus(id, "stopped");
      console.log(`[BOT-MANAGER] Stopped bot: ${instance.name}`);
    } catch {}
  }
  instances.clear();
}

export async function addBot(config: { name: string; token: string; clientId: string; features?: string }) {
  try {
    const [result] = await db.execute(
      "INSERT INTO bot_configs (name, token, client_id, features, status) VALUES (?, ?, ?, ?, 'stopped')",
      [config.name, config.token, config.clientId, config.features || "commands,refresh"]
    );
    const id = (result as any).insertId;

    // Start the new bot
    const botConfig = { id, ...config, enabled: true, features: config.features || "commands,refresh" };
    const instance = createBotClient(botConfig);
    instances.set(id, instance);
    await instance.client.login(instance.token);

    return { ok: true, id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function removeBot(id: number) {
  const instance = instances.get(id);
  if (instance) {
    instance.client.destroy();
    instances.delete(id);
  }
  try {
    await db.execute("DELETE FROM bot_configs WHERE id = ?", [id]);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function stopBot(id: number) {
  const instance = instances.get(id);
  if (instance) {
    instance.client.destroy();
    instance.status = "stopped";
    instances.delete(id);
    await updateBotStatus(id, "stopped");
    return { ok: true };
  }
  return { ok: false, error: "Bot not found" };
}
