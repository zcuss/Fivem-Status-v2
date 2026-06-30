// ============================================================
// Bot Manager — multi-bot support
// Manages N bot instances, each with its own discord.js Client
// Now with: AutoFind, Playtime tracking, Moderation, Health
// ============================================================

import { Client, Events, GatewayIntentBits, InteractionType, Message } from "discord.js";
import { db } from "@fivem/db";
import { parseDiscordIdList, parseBoolean } from "@fivem/shared";
import { INTERVAL, AUTHOR_NAME } from "@fivem/shared";
import { updatePlaytime, runPlaytimeArchiveMaintenance } from "./services/playtime.js";
import { loadEnabledAutoFindRows, runAutoFind } from "./services/autoFind.js";
import { handleAutoModeration } from "./services/moderation.js";

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
  clusterId?: string;
  useDBConfigs?: boolean;
}

const instances = new Map<number, BotInstance>();
let managerConfig: BotManagerConfig = {};

export function getInstances() { return instances; }
export function getInstance(id: number) { return instances.get(id); }

// ============================================================
// Get servers map from DB (server_configs table)
// ============================================================

async function getServersMap(): Promise<Record<string, string>> {
  try {
    const [rows]: any = await db.execute("SELECT server_key, server_code FROM server_configs");
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[String(row.server_key || "").toLowerCase()] = String(row.server_code || "");
    }
    return map;
  } catch {
    return {};
  }
}

// ============================================================
// Bot health tracking
// ============================================================

const healthCache = new Map<string, string>();

async function updateBotHealth(payload: {
  status?: string;
  lastRefresh?: string;
  latencyMs?: number | string;
  lastError?: string;
} = {}): Promise<void> {
  const entries: [string, string][] = [
    ["bot_health.status", String(payload.status || "")],
    ["bot_health.last_refresh", String(payload.lastRefresh || "")],
    ["bot_health.latency_ms", String(payload.latencyMs ?? "")],
    ["bot_health.last_error", String(payload.lastError || "")],
  ];

  const updates: [string, string][] = [];
  for (const [key, rawValue] of entries) {
    const value = String(rawValue ?? "");
    if (healthCache.get(key) === value) continue;
    updates.push([key, value]);
  }

  if (!updates.length) return;

  try {
    const values = updates.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
    const params: string[] = [];
    for (const [key, value] of updates) {
      params.push(key, value);
    }
    await db.execute(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ${values}
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
      params
    );
    for (const [key, value] of updates) {
      healthCache.set(key, value);
    }
  } catch (err: any) {
    const code = String(err?.code || "");
    if (code !== "42P01" && code !== "ER_NO_SUCH_TABLE") {
      console.error("[AUTO] Health update error:", err);
    }
  }
}

// ============================================================
// IDP presence (set bot activity with player count)
// ============================================================

let lastIdpPresence: number | null = null;

function setIdpPresence(client: Client, count: number): void {
  if (!client.user) return;
  if (!Number.isFinite(count)) return;
  if (lastIdpPresence === count) return;
  lastIdpPresence = count;
  try {
    client.user.setPresence({
      activities: [{ name: `IDP Player ${count}` }],
      status: "online",
    });
  } catch {}
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
    features: "commands,refresh",
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
      sql += " AND (cluster_id = $1 OR cluster_id IS NULL)";
      params.push(clusterId);
    }
    const [rows] = await db.execute(sql, params);
    return rows as any[];
  } catch {
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

  // ---- Client ready ----
  client.once(Events.ClientReady, async (readyClient) => {
    instance.status = "running";
    console.log(`[BOT:${instance.name}] Logged in as ${readyClient.user.tag} | ${readyClient.guilds.cache.size} guilds`);

    if (features.has("commands")) {
      await registerCommands(client, instance);
    }
    if (features.has("refresh")) {
      startAutoRefresh(client, instance);
    }
    if (features.has("voice")) {
      const { startVoiceSync } = await import("./services/voice.js");
      startVoiceSync(client);
    }

    await updateBotStatus(instance.id, "running");
  });

  // ---- Interaction handler ----
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        const mod = await import("./commands/index.js");
        const handled = await mod.handleButtonInteraction(interaction);
        if (handled) return;
      }
      if (interaction.type === InteractionType.ModalSubmit) {
        const mod = await import("./commands/index.js");
        const handled = await mod.handleSetupModal(interaction);
        if (handled) return;
      }
      if (interaction.isStringSelectMenu()) {
        const mod = await import("./commands/index.js");
        if (mod.handleSelectMenuInteraction) {
          const handled = await mod.handleSelectMenuInteraction(interaction);
          if (handled) return;
        }
      }
      if (!interaction.isChatInputCommand()) return;
      await handleCommand(interaction, instance);
    } catch (err: any) {
      const code = err?.code || err?.rawError?.code;
      if (code === 40060 || code === 10062) return;
      console.error(`[BOT:${instance.name}] Interaction error:`, err?.message || err);
    }
  });

  // ---- Message handler (moderation) ----
  client.on(Events.MessageCreate, async (message: Message) => {
    if (!features.has("moderation")) return;
    try {
      await handleAutoModeration(message);
    } catch (err) {
      console.error("[MODERATION] messageCreate handler error:", err);
    }
  });

  client.on(Events.Error, (err) => {
    console.error(`[BOT:${instance.name}] Error:`, err.message);
  });

  return instance;
}

// ============================================================
// Command handler — cached import
// ============================================================

let _commandsCache: Map<string, any> | null = null;

async function getCommands(): Promise<Map<string, any>> {
  if (!_commandsCache) {
    const mod = await import("./commands/index.js");
    _commandsCache = mod.commands;
  }
  return _commandsCache;
}

async function handleCommand(interaction: any, instance: BotInstance) {
  const commands = await getCommands();
  const cmd = commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction, instance);
  } catch (err: any) {
    console.error(`[BOT:${instance.name}] Command error:`, err?.message || err);
    const code = err?.code || err?.rawError?.code;
    if (code === 40060 || code === 10062) return;
    const reply = { content: "❌ Command error", flags: 0x40 };
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
// AUTO-REFRESH — full feature parity with reference
// ============================================================

let autoRefreshRunning = false;

async function startAutoRefresh(client: Client, instance: BotInstance) {
  console.log(`[BOT:${instance.name}] Starting auto-refresh (interval=${INTERVAL}ms)`);

  setInterval(async () => {
    if (autoRefreshRunning) return;
    autoRefreshRunning = true;

    try {
      // Health: starting
      await updateBotHealth({
        status: client.isReady() ? "online" : "starting",
        latencyMs: Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : "n/a",
      });

      const servers = await getServersMap();
      const serverKeys = Object.keys(servers);

      if (!serverKeys.length) {
        await updateBotHealth({
          status: client.isReady() ? "online" : "starting",
          latencyMs: Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : "n/a",
          lastRefresh: new Date().toISOString(),
        });
        return;
      }

      // Load auto-find rows for all servers
      const autoFindRows = await loadEnabledAutoFindRows(serverKeys);
      const autosByServer = new Map<string, any[]>();
      for (const row of autoFindRows) {
        const key = String(row.server_key || "").toLowerCase();
        if (!key) continue;
        if (!autosByServer.has(key)) autosByServer.set(key, []);
        autosByServer.get(key)!.push(row);
      }

      // Fetch ALL servers in parallel (not sequential!)
      const { fetchServerData } = await import("./services/server.js");
      const serverFetchPromises = serverKeys.map(async (serverKey) => {
        const serverCode = servers[serverKey];
        const data = await fetchServerData(serverCode);
        return { serverKey, ...data };
      });
      const fetchedResults = await Promise.all(serverFetchPromises);

      // Process each server
      for (const { serverKey, players } of fetchedResults) {
        // IDP presence
        if (String(serverKey || "").toLowerCase() === "idp") {
          setIdpPresence(client, players.length);
        }

        // Update playtime
        const { playtimeMap } = players.length
          ? await updatePlaytime(players, serverKey)
          : { playtimeMap: new Map() };

        // Run auto-find
        const autos = autosByServer.get(String(serverKey || "").toLowerCase()) || [];
        await runAutoFind(client, players, serverKey, autos, playtimeMap);
      }

      // Health: success
      await updateBotHealth({
        status: client.isReady() ? "online" : "starting",
        latencyMs: Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : "n/a",
        lastRefresh: new Date().toISOString(),
        lastError: "",
      });

      // Archive maintenance (runs once per day)
      await runPlaytimeArchiveMaintenance().catch((err) => {
        console.error("[PLAYTIME] archive maintenance error:", err);
      });
    } catch (err: any) {
      console.error("[AUTO] ERROR:", err);
      const message = String(err?.message || err || "Unknown error").slice(0, 200);
      await updateBotHealth({
        status: client.isReady() ? "online" : "starting",
        latencyMs: Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : "n/a",
        lastError: message,
      });
    } finally {
      autoRefreshRunning = false;
    }
  }, INTERVAL);
}

// ============================================================
// Bot status persistence
// ============================================================

async function updateBotStatus(id: number, status: string) {
  if (!id) return;
  try {
    await db.execute(
      "UPDATE bot_configs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
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

  const dbConfigs = config.useDBConfigs !== false ? await loadBotConfigs(config.clusterId) : [];

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
    const [result]: any = await db.execute(
      "INSERT INTO bot_configs (name, token, client_id, features, status) VALUES ($1, $2, $3, $4, 'stopped') RETURNING id",
      [config.name, config.token, config.clientId, config.features || "commands,refresh"]
    );
    const id = result?.id || (result as any)?.[0]?.id;
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
    await db.execute("DELETE FROM bot_configs WHERE id = $1", [id]);
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
