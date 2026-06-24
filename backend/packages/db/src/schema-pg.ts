// @ts-nocheck
import {
  pgTable,
  serial,
  integer as pgInt,
  bigint as pgBigint,
  varchar as pgVarchar,
  text as pgText,
  timestamp as pgTimestamp,
  date as pgDate,
  smallint,
  uniqueIndex,
  index as pgIndex,
  primaryKey,
} from "drizzle-orm/pg-core";


export const pgUserRoles = pgTable("user_roles", {
  discordId: pgBigint("discord_id", { mode: "number" }).primaryKey(),
  role: pgVarchar("role", { length: 32 }).notNull().default("user"),
  maxAuto: pgInt("max_auto").notNull().default(1),
  roleLabel: pgVarchar("role_label", { length: 64 }),
  expiresAt: pgTimestamp("expires_at"),
  discordName: pgVarchar("discord_name", { length: 64 }),
  discordUsername: pgVarchar("discord_username", { length: 64 }),
  lastLoginAt: pgTimestamp("last_login_at"),
});

export const pgAppSettings = pgTable("app_settings", {
  settingKey: pgVarchar("setting_key", { length: 64 }).primaryKey(),
  settingValue: pgText("setting_value").notNull(),
  updatedAt: pgTimestamp("updated_at").notNull().defaultNow(),
});

export const pgGuildSettings = pgTable("guild_settings", {
  guildId: pgBigint("guild_id", { mode: "number" }),
  settingKey: pgVarchar("setting_key", { length: 64 }),
  settingValue: pgText("setting_value").notNull(),
  updatedAt: pgTimestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.settingKey] }),
}));

export const pgServerConfigs = pgTable("server_configs", {
  serverKey: pgVarchar("server_key", { length: 64 }).primaryKey(),
  serverCode: pgVarchar("server_code", { length: 64 }).notNull(),
  createdBy: pgBigint("created_by", { mode: "number" }).notNull(),
}, (t) => ({
  uniqCode: uniqueIndex("uniq_server_code").on(t.serverCode),
}));

export const pgAutoFind = pgTable("auto_find", {
  id: serial("id").primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  guildId: pgBigint("guild_id", { mode: "number" }).notNull(),
  serverKey: pgVarchar("server_key", { length: 64 }).notNull(),
  keyword: pgVarchar("keyword", { length: 100 }).notNull(),
  channelId: pgBigint("channel_id", { mode: "number" }).notNull(),
  messageId: pgBigint("message_id", { mode: "number" }),
  logo: pgVarchar("logo", { length: 512 }),
  color: pgVarchar("color", { length: 32 }),
  enabled: smallint("enabled").notNull().default(1),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("uniq_af_rule").on(t.discordId, t.guildId, t.serverKey, t.keyword, t.channelId),
}));

export const pgServerActivity = pgTable("server_activity", {
  discordId: pgBigint("discord_id", { mode: "number" }),
  guildId: pgBigint("guild_id", { mode: "number" }),
  hitCount: pgInt("hit_count").notNull().default(0),
  lastSeen: pgTimestamp("last_seen").notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.discordId, t.guildId] }),
}));

export const pgServerActivityDaily = pgTable("server_activity_daily", {
  guildId: pgBigint("guild_id", { mode: "number" }),
  activityDate: pgDate("activity_date"),
  hitCount: pgInt("hit_count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.activityDate] }),
}));

export const pgServerChangeRequests = pgTable("server_change_requests", {
  id: serial("id").primaryKey(),
  serverKey: pgVarchar("server_key", { length: 64 }).notNull(),
  requestedBy: pgBigint("requested_by", { mode: "number" }).notNull(),
  proposedCode: pgVarchar("proposed_code", { length: 64 }).notNull(),
  status: pgVarchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
  decidedAt: pgTimestamp("decided_at"),
  decidedBy: pgBigint("decided_by", { mode: "number" }),
});

export const pgServerLogs = pgTable("server_logs", {
  id: serial("id").primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  guildId: pgBigint("guild_id", { mode: "number" }).notNull(),
  action: pgVarchar("action", { length: 64 }).notNull(),
  detail: pgVarchar("detail", { length: 255 }),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgSteamPlayers = pgTable("steam_players", {
  steamHex: pgVarchar("steam_hex", { length: 32 }).primaryKey(),
  playerName: pgVarchar("player_name", { length: 128 }).notNull(),
  playerKey: pgVarchar("player_key", { length: 255 }).notNull(),
  lastSeen: pgTimestamp("last_seen").notNull().defaultNow(),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgSteamPlayerRanks = pgTable("steam_player_ranks", {
  id: serial("id").primaryKey(),
  ownerDiscordId: pgBigint("owner_discord_id", { mode: "number" }).notNull(),
  steamHex: pgVarchar("steam_hex", { length: 32 }).notNull(),
  rankLabel: pgVarchar("rank_label", { length: 32 }).notNull(),
  updatedAt: pgTimestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("uniq_steam_rank_owner_hex").on(t.ownerDiscordId, t.steamHex),
}));

export const pgCommandUsageDaily = pgTable("command_usage_daily", {
  guildId: pgBigint("guild_id", { mode: "number" }),
  commandName: pgVarchar("command_name", { length: 32 }),
  usageDate: pgDate("usage_date"),
  usageCount: pgInt("usage_count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.commandName, t.usageDate] }),
}));

export const pgCommandUsageUserDaily = pgTable("command_usage_user_daily", {
  guildId: pgBigint("guild_id", { mode: "number" }),
  discordId: pgBigint("discord_id", { mode: "number" }),
  commandName: pgVarchar("command_name", { length: 32 }),
  usageDate: pgDate("usage_date"),
  usageCount: pgInt("usage_count").notNull().default(0),
  displayName: pgVarchar("display_name", { length: 64 }),
  username: pgVarchar("username", { length: 64 }),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.discordId, t.commandName, t.usageDate] }),
}));

export const pgCommandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  guildId: pgBigint("guild_id", { mode: "number" }).notNull(),
  commandName: pgVarchar("command_name", { length: 32 }).notNull(),
  serverKey: pgVarchar("server_key", { length: 64 }),
  queryText: pgVarchar("query_text", { length: 191 }),
  channelId: pgBigint("channel_id", { mode: "number" }),
  channelName: pgVarchar("channel_name", { length: 100 }),
  displayName: pgVarchar("display_name", { length: 64 }),
  username: pgVarchar("username", { length: 64 }),
  detail: pgVarchar("detail", { length: 255 }),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgModerationLogs = pgTable("moderation_logs", {
  id: serial("id").primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  guildId: pgBigint("guild_id", { mode: "number" }).notNull(),
  channelId: pgBigint("channel_id", { mode: "number" }),
  messageId: pgBigint("message_id", { mode: "number" }),
  reason: pgVarchar("reason", { length: 64 }).notNull(),
  detail: pgVarchar("detail", { length: 255 }),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgSubscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  subscriptionId: pgVarchar("subscription_id", { length: 64 }).notNull(),
  status: pgVarchar("status", { length: 32 }).notNull().default("active"),
  amount: pgInt("amount").notNull().default(0),
  intervalValue: pgInt("interval_value").notNull().default(1),
  intervalUnit: pgVarchar("interval_unit", { length: 16 }).notNull().default("month"),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("uniq_subscription").on(t.subscriptionId),
}));

export const pgPremiumOrders = pgTable("premium_orders", {
  orderId: pgVarchar("order_id", { length: 64 }).primaryKey(),
  discordId: pgBigint("discord_id", { mode: "number" }).notNull(),
  amount: pgInt("amount").notNull().default(0),
  status: pgVarchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgPlaytimePlayers = pgTable("playtime_players", {
  id: serial("id").primaryKey(),
  playerKey: pgVarchar("player_key", { length: 255 }).notNull(),
  latestName: pgVarchar("latest_name", { length: 128 }).notNull(),
  latestPlayerId: pgInt("latest_player_id").notNull().default(0),
  updatedAt: pgTimestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("uniq_playtime_player_key").on(t.playerKey),
}));

export const pgPlaytimeDailyHot = pgTable("playtime_daily_hot", {
  serverKey: pgVarchar("server_key", { length: 64 }),
  playerRef: pgBigint("player_ref", { mode: "number" }),
  playDate: pgDate("play_date"),
  lastSeen: pgTimestamp("last_seen").notNull(),
  playtimeSeconds: pgInt("playtime_seconds").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.serverKey, t.playerRef, t.playDate] }),
}));

export const pgPlaytimeDailyArchive = pgTable("playtime_daily_archive", {
  serverKey: pgVarchar("server_key", { length: 64 }),
  playerRef: pgBigint("player_ref", { mode: "number" }),
  playDate: pgDate("play_date"),
  lastSeen: pgTimestamp("last_seen").notNull(),
  playtimeSeconds: pgInt("playtime_seconds").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.serverKey, t.playerRef, t.playDate] }),
}));

export const pgBotLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  level: pgVarchar("level", { length: 16 }).notNull(),
  source: pgVarchar("source", { length: 32 }).notNull(),
  message: pgVarchar("message", { length: 1024 }).notNull(),
  guildId: pgBigint("guild_id", { mode: "number" }),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgConsoleLogs = pgTable("console_logs", {
  id: serial("id").primaryKey(),
  level: pgVarchar("level", { length: 16 }).notNull(),
  message: pgVarchar("message", { length: 1024 }).notNull(),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
});

export const pgBotConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  name: pgVarchar("name", { length: 64 }).notNull(),
  token: pgVarchar("token", { length: 256 }).notNull(),
  clientId: pgVarchar("client_id", { length: 64 }).notNull(),
  enabled: smallint("enabled").notNull().default(1),
  clusterId: pgVarchar("cluster_id", { length: 64 }),
  features: pgVarchar("features", { length: 512 }).default("commands,refresh,voice"),
  status: pgVarchar("status", { length: 32 }).notNull().default("stopped"),
  createdAt: pgTimestamp("created_at").notNull().defaultNow(),
  updatedAt: pgTimestamp("updated_at").notNull().defaultNow(),
});
