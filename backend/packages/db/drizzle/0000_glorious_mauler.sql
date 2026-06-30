CREATE TABLE "app_settings" (
	"setting_key" varchar(64) PRIMARY KEY NOT NULL,
	"setting_value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auto_find" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"guild_id" bigint NOT NULL,
	"server_key" varchar(64) NOT NULL,
	"keyword" varchar(100) NOT NULL,
	"channel_id" bigint NOT NULL,
	"message_id" bigint,
	"logo" varchar(512),
	"color" varchar(32),
	"enabled" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"token" varchar(256) NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"enabled" smallint DEFAULT 1 NOT NULL,
	"cluster_id" varchar(64),
	"features" varchar(512) DEFAULT 'commands,refresh,voice',
	"status" varchar(32) DEFAULT 'stopped' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(16) NOT NULL,
	"source" varchar(32) NOT NULL,
	"message" varchar(1024) NOT NULL,
	"guild_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"guild_id" bigint NOT NULL,
	"command_name" varchar(32) NOT NULL,
	"server_key" varchar(64),
	"query_text" varchar(191),
	"channel_id" bigint,
	"channel_name" varchar(100),
	"display_name" varchar(64),
	"username" varchar(64),
	"detail" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_usage_daily" (
	"guild_id" bigint,
	"command_name" varchar(32),
	"usage_date" date,
	"usage_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "command_usage_daily_guild_id_command_name_usage_date_pk" PRIMARY KEY("guild_id","command_name","usage_date")
);
--> statement-breakpoint
CREATE TABLE "command_usage_user_daily" (
	"guild_id" bigint,
	"discord_id" bigint,
	"command_name" varchar(32),
	"usage_date" date,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"display_name" varchar(64),
	"username" varchar(64),
	CONSTRAINT "command_usage_user_daily_guild_id_discord_id_command_name_usage_date_pk" PRIMARY KEY("guild_id","discord_id","command_name","usage_date")
);
--> statement-breakpoint
CREATE TABLE "console_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(16) NOT NULL,
	"message" varchar(1024) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_settings" (
	"guild_id" bigint,
	"setting_key" varchar(64),
	"setting_value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_settings_guild_id_setting_key_pk" PRIMARY KEY("guild_id","setting_key")
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"guild_id" bigint NOT NULL,
	"channel_id" bigint,
	"message_id" bigint,
	"reason" varchar(64) NOT NULL,
	"detail" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playtime_daily_archive" (
	"server_key" varchar(64),
	"player_ref" bigint,
	"play_date" date,
	"last_seen" timestamp NOT NULL,
	"playtime_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "playtime_daily_archive_server_key_player_ref_play_date_pk" PRIMARY KEY("server_key","player_ref","play_date")
);
--> statement-breakpoint
CREATE TABLE "playtime_daily_hot" (
	"server_key" varchar(64),
	"player_ref" bigint,
	"play_date" date,
	"last_seen" timestamp NOT NULL,
	"playtime_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "playtime_daily_hot_server_key_player_ref_play_date_pk" PRIMARY KEY("server_key","player_ref","play_date")
);
--> statement-breakpoint
CREATE TABLE "playtime_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_key" varchar(255) NOT NULL,
	"latest_name" varchar(128) NOT NULL,
	"latest_player_id" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_orders" (
	"order_id" varchar(64) PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_activity" (
	"discord_id" bigint,
	"guild_id" bigint,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "server_activity_discord_id_guild_id_pk" PRIMARY KEY("discord_id","guild_id")
);
--> statement-breakpoint
CREATE TABLE "server_activity_daily" (
	"guild_id" bigint,
	"activity_date" date,
	"hit_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "server_activity_daily_guild_id_activity_date_pk" PRIMARY KEY("guild_id","activity_date")
);
--> statement-breakpoint
CREATE TABLE "server_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_key" varchar(64) NOT NULL,
	"requested_by" bigint NOT NULL,
	"proposed_code" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"decided_by" bigint
);
--> statement-breakpoint
CREATE TABLE "server_configs" (
	"server_key" varchar(64) PRIMARY KEY NOT NULL,
	"server_code" varchar(64) NOT NULL,
	"created_by" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"guild_id" bigint NOT NULL,
	"action" varchar(64) NOT NULL,
	"detail" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steam_player_ranks" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_discord_id" bigint NOT NULL,
	"steam_hex" varchar(32) NOT NULL,
	"rank_label" varchar(32) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steam_players" (
	"steam_hex" varchar(32) PRIMARY KEY NOT NULL,
	"player_name" varchar(128) NOT NULL,
	"player_key" varchar(255) NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" bigint NOT NULL,
	"subscription_id" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"interval_value" integer DEFAULT 1 NOT NULL,
	"interval_unit" varchar(16) DEFAULT 'month' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"discord_id" bigint PRIMARY KEY NOT NULL,
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"max_auto" integer DEFAULT 1 NOT NULL,
	"role_label" varchar(64),
	"expires_at" timestamp,
	"discord_name" varchar(64),
	"discord_username" varchar(64),
	"last_login_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_af_rule" ON "auto_find" USING btree ("discord_id","guild_id","server_key","keyword","channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_playtime_player_key" ON "playtime_players" USING btree ("player_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_server_code" ON "server_configs" USING btree ("server_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_steam_rank_owner_hex" ON "steam_player_ranks" USING btree ("owner_discord_id","steam_hex");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_subscription" ON "subscriptions" USING btree ("subscription_id");