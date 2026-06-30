// ============================================================
// Voice Connection Management
// Joins/leaves voice channels based on guild_settings config
// Ported from ~/Fivem-Status/src/voice.ts
// ============================================================

import {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  createAudioPlayer,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { ChannelType, Client } from "discord.js";
import { db } from "@fivem/db";

const voiceState = new Map<string, any>();
const pendingJoins = new Map<string, Promise<void>>();
let consecutiveSettingsErrors = 0;
let hasLoggedPause = false;
let nextAllowedSyncAt = 0;

// ============================================================
// Load voice settings from DB
// ============================================================

async function getVoiceSettingsMap() {
  const now = Date.now();
  if (now < nextAllowedSyncAt) {
    return { ok: false, paused: true, map: null };
  }
  try {
    const [rows]: any = await db.execute(
      `SELECT guild_id, setting_key, setting_value
       FROM guild_settings
       WHERE setting_key IN (
         'voice.enabled',
         'voice.join_channel_id',
         'voice.channel_id'
       )`
    );
    const map = new Map<string, any>();
    for (const row of rows) {
      const guildId = String(row.guild_id);
      if (!map.has(guildId)) {
        map.set(guildId, {
          joinEnabled: false,
          joinChannelId: "",
          legacyChannelId: "",
        });
      }
      const entry = map.get(guildId);
      if (row.setting_key === "voice.enabled") {
        entry.joinEnabled = String(row.setting_value) === "true";
      }
      if (row.setting_key === "voice.join_channel_id") {
        entry.joinChannelId = String(row.setting_value || "");
      }
      if (row.setting_key === "voice.channel_id") {
        entry.legacyChannelId = String(row.setting_value || "");
      }
    }

    // Fallback: legacy channel_id → join_channel_id
    for (const [, entry] of map) {
      if (!entry.joinChannelId && entry.legacyChannelId) {
        entry.joinChannelId = entry.legacyChannelId;
      }
    }

    consecutiveSettingsErrors = 0;
    hasLoggedPause = false;
    nextAllowedSyncAt = 0;
    return { ok: true, paused: false, map };
  } catch (err: any) {
    const code = String(err?.code || "");
    if (code !== "42P01" && code !== "ER_NO_SUCH_TABLE") {
      console.error("[VOICE] Settings load error:", err);
    }
    consecutiveSettingsErrors += 1;
    const basePause = Number(process.env.VOICE_DB_RETRY_BASE_MS || 5000);
    const maxPause = Number(process.env.VOICE_DB_RETRY_MAX_MS || 60000);
    const pauseMs = Math.min(maxPause, basePause * Math.max(1, consecutiveSettingsErrors));
    nextAllowedSyncAt = Date.now() + pauseMs;
    if (!hasLoggedPause && consecutiveSettingsErrors >= 3) {
      hasLoggedPause = true;
      console.warn(`[VOICE] Pause sync sementara ${pauseMs}ms karena DB timeout berulang`);
    }
    return { ok: false, paused: false, map: null };
  }
}

// ============================================================
// Disconnect from a guild's voice channel
// ============================================================

async function disconnectGuild(guildId: string) {
  const existing = voiceState.get(guildId);
  if (!existing) return;
  try {
    existing.connection?.destroy();
  } catch {}
  voiceState.delete(guildId);
}

// ============================================================
// Connect to a guild's voice channel
// ============================================================

async function connectGuild(client: Client, guildId: string, channelId: string) {
  if (!client.isReady()) {
    console.warn(`[VOICE] Skip join before client ready guild=${guildId} channel=${channelId}`);
    return;
  }
  if (pendingJoins.has(guildId)) {
    return pendingJoins.get(guildId);
  }

  const task = (async () => {
    let guild = await client.guilds.fetch(guildId).catch(() => null);
    let channel = guild ? await guild.channels.fetch(channelId).catch(() => null) : null;

    if (!channel) {
      channel = await client.channels.fetch(channelId).catch(() => null) as any;
      if (channel?.guildId && String(channel.guildId) !== String(guildId)) {
        console.warn(
          `[VOICE] Join channel guild mismatch settingGuild=${guildId} channelGuild=${channel.guildId} channel=${channelId}`
        );
      }
      if (channel?.guild) {
        guild = channel.guild;
      } else if (channel?.guildId) {
        guild = await client.guilds.fetch(channel.guildId).catch(() => null);
      }
    }

    if (!guild) {
      console.error(`[VOICE] Join failed guild not found settingGuild=${guildId} channel=${channelId}`);
      return;
    }
    if (!channel) {
      console.error(`[VOICE] Join failed channel not found settingGuild=${guildId} channel=${channelId}`);
      return;
    }
    if (![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type as any)) {
      console.error(
        `[VOICE] Join failed invalid channel type settingGuild=${guildId} channel=${channelId} type=${channel.type}`
      );
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator as any,
      selfDeaf: false,
      selfMute: false,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    connection.subscribe(player);

    const joinTimeoutMs = Number(process.env.VOICE_JOIN_TIMEOUT_MS || 20000);
    const joinRetries = Math.max(0, Number(process.env.VOICE_JOIN_RETRIES || 1) || 1);

    try {
      for (let attempt = 0; attempt <= joinRetries; attempt += 1) {
        try {
          await entersState(connection, VoiceConnectionStatus.Ready, joinTimeoutMs);
          voiceState.set(guildId, { connection, channelId, player, guildId: guild.id });
          console.log(`[VOICE] Joined ${guild.name} -> ${channel.name}`);
          break;
        } catch (err: any) {
          const isLastAttempt = attempt >= joinRetries;
          if (isLastAttempt) {
            console.error("[VOICE] Failed to join:", err?.message || err);
            try { connection.destroy(); } catch {}
            return;
          }
          console.warn(
            `[VOICE] Join retry ${attempt + 1}/${joinRetries} guild=${guild.id} channel=${channel.id} reason=${err?.message || err}`
          );
          try { connection.rejoin(); } catch {}
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        const current = voiceState.get(guildId);
        if (current?.connection !== connection) return;
        voiceState.delete(guildId);
      });
    } catch (err: any) {
      console.error("[VOICE] Unexpected join error:", err?.message || err);
      try { connection.destroy(); } catch {}
    }
  })();

  pendingJoins.set(guildId, task);
  try {
    await task;
  } finally {
    pendingJoins.delete(guildId);
  }
}

// ============================================================
// Sync all voice connections based on DB settings
// ============================================================

export async function syncVoiceConnections(client: Client) {
  const settingsResult = await getVoiceSettingsMap();
  if (!settingsResult.ok) {
    // DB error → don't change voice state (avoid disconnect/reconnect loop)
    return;
  }
  const settings = settingsResult.map;

  // Disconnect guilds that no longer want voice
  for (const [guildId, state] of voiceState.entries()) {
    const desired = settings!.get(guildId);
    if (!desired || !desired.joinEnabled || !desired.joinChannelId) {
      pendingJoins.delete(guildId);
      await disconnectGuild(guildId);
      continue;
    }
    if (desired.joinChannelId !== state.channelId) {
      pendingJoins.delete(guildId);
      await disconnectGuild(guildId);
    }
  }

  // Connect guilds that want voice
  for (const [guildId, desired] of settings!.entries()) {
    if (desired.joinEnabled && desired.joinChannelId) {
      const existing = voiceState.get(guildId);
      if (!existing || existing.channelId !== desired.joinChannelId) {
        await connectGuild(client, guildId, desired.joinChannelId);
      }
    }
  }
}

// ============================================================
// Start periodic voice sync
// ============================================================

export function startVoiceSync(client: Client, intervalMs = 10_000) {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncVoiceConnections(client);
    } catch (err) {
      console.error("[VOICE] Sync error:", err);
    } finally {
      running = false;
    }
  };
  run();
  return setInterval(run, intervalMs);
}
