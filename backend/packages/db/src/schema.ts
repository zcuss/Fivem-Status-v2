// @ts-nocheck
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import {
  mysqlTable,
  varchar,
  int,
  bigint,
  tinyint,
  timestamp,
  datetime,
  date,
  enum as mysqlEnum,
  mediumtext,
  Engine,
} from "drizzle-orm/mysql-core";
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

// ============================================================
// Abstract schema definitions (dialect-agnostic)
// ============================================================

// We define schemas per dialect. The connection factory picks the right one.
// This is the laziest approach — no abstraction layer, just dialect-specific tables.

// ========================= MYSQL SCHEMA =========================

export const mysqlUserRoles = mysqlTable("user_roles", {
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).primaryKey(),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  maxAuto: int("max_auto").notNull().default(1),
  roleLabel: varchar("role_label", { length: 64 }),
  expiresAt: datetime("expires_at"),
  discordName: varchar("discord_name", { length: 64 }),
  discordUsername: varchar("discord_username", { length: 64 }),
  lastLoginAt: datetime("last_login_at"),
});

export const mysqlAppSettings = mysqlTable("app_settings", {
  settingKey: varchar("setting_key", { length: 64 }).primaryKey(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const mysqlGuildSettings = mysqlTable("guild_settings", {
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  settingKey: varchar("setting_key", { length: 64 }),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.settingKey] }),
}));

export const mysqlServerConfigs = mysqlTable("server_configs", {
  serverKey: varchar("server_key", { length: 64 }).primaryKey(),
  serverCode: varchar("server_code", { length: 64 }).notNull().unique(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
});

export const mysqlAutoFind = mysqlTable("auto_find", {
  id: int("id").primaryKey().autoincrement(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }).notNull(),
  serverKey: varchar("server_key", { length: 64 }).notNull(),
  keyword: varchar("keyword", { length: 100 }).notNull(),
  channelId: bigint("channel_id", { mode: "number", unsigned: true }).notNull(),
  messageId: bigint("message_id", { mode: "number", unsigned: true }),
  logo: varchar("logo", { length: 512 }),
  color: varchar("color", { length: 32 }),
  enabled: tinyint("enabled").notNull().default(1),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlServerActivity = mysqlTable("server_activity", {
  discordId: bigint("discord_id", { mode: "number", unsigned: true }),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  hitCount: int("hit_count").notNull().default(0),
  lastSeen: timestamp("last_seen").notNull().defaultNow().onUpdateNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.discordId, t.guildId] }),
}));

export const mysqlServerActivityDaily = mysqlTable("server_activity_daily", {
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  activityDate: date("activity_date"),
  hitCount: int("hit_count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.activityDate] }),
}));

export const mysqlServerChangeRequests = mysqlTable("server_change_requests", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  serverKey: varchar("server_key", { length: 64 }).notNull(),
  requestedBy: bigint("requested_by", { mode: "number", unsigned: true }).notNull(),
  proposedCode: varchar("proposed_code", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: datetime("created_at").notNull().defaultNow(),
  decidedAt: datetime("decided_at"),
  decidedBy: bigint("decided_by", { mode: "number", unsigned: true }),
});

export const mysqlServerLogs = mysqlTable("server_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  detail: varchar("detail", { length: 255 }),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlSteamPlayers = mysqlTable("steam_players", {
  steamHex: varchar("steam_hex", { length: 32 }).primaryKey(),
  playerName: varchar("player_name", { length: 128 }).notNull(),
  playerKey: varchar("player_key", { length: 255 }).notNull(),
  lastSeen: datetime("last_seen").notNull().defaultNow(),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlSteamPlayerRanks = mysqlTable("steam_player_ranks", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  ownerDiscordId: bigint("owner_discord_id", { mode: "number", unsigned: true }).notNull(),
  steamHex: varchar("steam_hex", { length: 32 }).notNull(),
  rankLabel: varchar("rank_label", { length: 32 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const mysqlCommandUsageDaily = mysqlTable("command_usage_daily", {
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  commandName: varchar("command_name", { length: 32 }),
  usageDate: date("usage_date"),
  usageCount: int("usage_count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.commandName, t.usageDate] }),
}));

export const mysqlCommandUsageUserDaily = mysqlTable("command_usage_user_daily", {
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }),
  commandName: varchar("command_name", { length: 32 }),
  usageDate: date("usage_date"),
  usageCount: int("usage_count").notNull().default(0),
  displayName: varchar("display_name", { length: 64 }),
  username: varchar("username", { length: 64 }),
}, (t) => ({
  pk: primaryKey({ columns: [t.guildId, t.discordId, t.commandName, t.usageDate] }),
}));

export const mysqlCommandLogs = mysqlTable("command_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }).notNull(),
  commandName: varchar("command_name", { length: 32 }).notNull(),
  serverKey: varchar("server_key", { length: 64 }),
  queryText: varchar("query_text", { length: 191 }),
  channelId: bigint("channel_id", { mode: "number", unsigned: true }),
  channelName: varchar("channel_name", { length: 100 }),
  displayName: varchar("display_name", { length: 64 }),
  username: varchar("username", { length: 64 }),
  detail: varchar("detail", { length: 255 }),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlModerationLogs = mysqlTable("moderation_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }).notNull(),
  channelId: bigint("channel_id", { mode: "number", unsigned: true }),
  messageId: bigint("message_id", { mode: "number", unsigned: true }),
  reason: varchar("reason", { length: 64 }).notNull(),
  detail: varchar("detail", { length: 255 }),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlSubscriptions = mysqlTable("subscriptions", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  subscriptionId: varchar("subscription_id", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  amount: int("amount").notNull().default(0),
  intervalValue: int("interval_value").notNull().default(1),
  intervalUnit: varchar("interval_unit", { length: 16 }).notNull().default("month"),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlPremiumOrders = mysqlTable("premium_orders", {
  orderId: varchar("order_id", { length: 64 }).primaryKey(),
  discordId: bigint("discord_id", { mode: "number", unsigned: true }).notNull(),
  amount: int("amount").notNull().default(0),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlPlaytimePlayers = mysqlTable("playtime_players", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  playerKey: varchar("player_key", { length: 255 }).notNull().unique(),
  latestName: varchar("latest_name", { length: 128 }).notNull(),
  latestPlayerId: int("latest_player_id").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const mysqlPlaytimeDailyHot = mysqlTable("playtime_daily_hot", {
  serverKey: varchar("server_key", { length: 64 }),
  playerRef: bigint("player_ref", { mode: "number", unsigned: true }),
  playDate: date("play_date"),
  lastSeen: datetime("last_seen").notNull(),
  playtimeSeconds: int("playtime_seconds", { unsigned: true }).notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.serverKey, t.playerRef, t.playDate] }),
}));

export const mysqlPlaytimeDailyArchive = mysqlTable("playtime_daily_archive", {
  serverKey: varchar("server_key", { length: 64 }),
  playerRef: bigint("player_ref", { mode: "number", unsigned: true }),
  playDate: date("play_date"),
  lastSeen: datetime("last_seen").notNull(),
  playtimeSeconds: int("playtime_seconds", { unsigned: true }).notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.serverKey, t.playerRef, t.playDate] }),
}));

export const mysqlBotLogs = mysqlTable("bot_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  level: varchar("level", { length: 16 }).notNull(),
  source: varchar("source", { length: 32 }).notNull(),
  message: varchar("message", { length: 1024 }).notNull(),
  guildId: bigint("guild_id", { mode: "number", unsigned: true }),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

export const mysqlConsoleLogs = mysqlTable("console_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey().autoincrement(),
  level: varchar("level", { length: 16 }).notNull(),
  message: varchar("message", { length: 1024 }).notNull(),
  createdAt: datetime("created_at").notNull().defaultNow(),
});

// ========================= BOT CONFIGS (NEW) =========================
// Multi-bot support: each bot has its own config stored in DB

export const mysqlBotConfigs = mysqlTable("bot_configs", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 64 }).notNull(),
  token: varchar("token", { length: 256 }).notNull(),
  clientId: varchar("client_id", { length: 64 }).notNull(),
  enabled: tinyint("enabled").notNull().default(1),
  clusterId: varchar("cluster_id", { length: 64 }),
  features: varchar("features", { length: 512 }).default("commands,refresh,voice"),
  status: varchar("status", { length: 32 }).notNull().default("stopped"),
  createdAt: datetime("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ========================= POSTGRES / COCKROACHDB SCHEMA =========================

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
