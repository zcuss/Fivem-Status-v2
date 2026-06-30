// ============================================================
// Moderation Service
// Auto-deletes @everyone spam with attachments
// Ported from ~/Fivem-Status/src/bot.ts
// ============================================================

import { Message, PermissionsBitField } from "discord.js";
import { db } from "@fivem/db";
import { parseBoolean, parseInteger } from "@fivem/shared";

// Settings cache (30s TTL)
const moderationSettingsCache = new Map<string, { value: any; fetchedAt: number }>();

interface ModerationSettings {
  enabled: boolean;
  deleteEveryoneWithAttachments: boolean;
  attachmentThreshold: number;
}

function parseBooleanSetting(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseIntegerSetting(value: string | undefined, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

// ============================================================
// Get guild moderation settings (cached 30s)
// ============================================================

async function getGuildModerationSettings(guildId: string): Promise<ModerationSettings> {
  const key = String(guildId || "").trim();
  if (!key) {
    return { enabled: false, deleteEveryoneWithAttachments: false, attachmentThreshold: 4 };
  }

  const cached = moderationSettingsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < 30000) {
    return cached.value;
  }

  try {
    const [rows]: any = await db.execute(
      `SELECT setting_key, setting_value
       FROM guild_settings
       WHERE guild_id=$1
         AND setting_key IN (
           'moderation.enabled',
           'moderation.delete_everyone_with_attachments',
           'moderation.everyone_attachment_threshold'
         )`,
      [key]
    );

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[String(row.setting_key || "")] = String(row.setting_value || "");
    }

    const value: ModerationSettings = {
      enabled: parseBooleanSetting(map["moderation.enabled"], false),
      deleteEveryoneWithAttachments: parseBooleanSetting(
        map["moderation.delete_everyone_with_attachments"], false
      ),
      attachmentThreshold: parseIntegerSetting(
        map["moderation.everyone_attachment_threshold"], 4, 1, 10
      ),
    };

    moderationSettingsCache.set(key, { value, fetchedAt: Date.now() });
    return value;
  } catch {
    return { enabled: false, deleteEveryoneWithAttachments: false, attachmentThreshold: 4 };
  }
}

// ============================================================
// Check if message has @everyone mention
// ============================================================

function messageHasEveryoneMention(message: Message): boolean {
  return Boolean(message.mentions?.everyone) || /@everyone\b/i.test(String(message.content || ""));
}

// ============================================================
// Write moderation log to DB
// ============================================================

async function writeModerationLog(message: Message, reason: string, detail: string): Promise<void> {
  if (!message?.guildId || !message?.author?.id || !reason) return;
  try {
    await db.execute(
      `INSERT INTO moderation_logs
       (discord_id, guild_id, channel_id, message_id, reason, detail)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        message.author.id,
        message.guildId,
        message.channelId || null,
        message.id || null,
        String(reason).slice(0, 64),
        String(detail || "").slice(0, 255) || null,
      ]
    );
  } catch (err: any) {
    // Table might not exist — silently skip
    const code = String(err?.code || "");
    if (code !== "42P01" && code !== "ER_NO_SUCH_TABLE") {
      console.error("[MODERATION] Failed to write moderation log:", err);
    }
  }
}

// ============================================================
// Handle auto-moderation for a message
// ============================================================

export async function handleAutoModeration(message: Message): Promise<void> {
  if (!message?.guildId || !message.guild || message.author?.bot) return;
  if (!message.deletable) return;

  // Skip if user has ManageMessages permission
  const member =
    message.member ||
    (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (member?.permissions?.has(PermissionsBitField.Flags.ManageMessages)) return;

  const settings = await getGuildModerationSettings(message.guildId).catch(() => null);
  if (!settings?.enabled) return;

  const attachmentCount = message.attachments?.size || 0;
  const shouldDeleteEveryoneAttachments =
    settings.deleteEveryoneWithAttachments &&
    messageHasEveryoneMention(message) &&
    attachmentCount >= settings.attachmentThreshold;

  if (!shouldDeleteEveryoneAttachments) return;

  const detail = [
    "rule:everyone_attachments",
    `attachments:${attachmentCount}`,
    `threshold:${settings.attachmentThreshold}`,
    `channel:${message.channelId || "-"}`,
    `author:${message.author?.id || "-"}`,
  ].join(" | ");

  await writeModerationLog(message, "everyone_attachment_spam", detail);
  await message.delete().catch((err) => {
    console.error(
      `[MODERATION] Failed to delete message guild=${message.guildId} channel=${message.channelId} message=${message.id}:`,
      err
    );
  });
}
