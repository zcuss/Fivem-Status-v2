#!/usr/bin/env node
// ============================================================
// MySQL → CockroachDB/Postgres migration script
// Reads all data from MySQL, transforms to PG-compatible format,
// and inserts into target database.
// ============================================================

import "dotenv/config";
import mysql from "mysql2/promise";
import pg from "pg";

const SOURCE_DSN = process.env.MIGRATION_SOURCE_DSN;
const TARGET_DSN = process.env.MIGRATION_TARGET_DSN;

if (!SOURCE_DSN || !TARGET_DSN) {
  console.error("Set MIGRATION_SOURCE_DSN and MIGRATION_TARGET_DSN in .env");
  process.exit(1);
}

// Tables to migrate (order matters for FK constraints)
const TABLES = [
  "user_roles",
  "app_settings",
  "guild_settings",
  "server_configs",
  "auto_find",
  "server_activity",
  "server_activity_daily",
  "server_change_requests",
  "server_logs",
  "steam_players",
  "steam_player_ranks",
  "command_usage_daily",
  "command_usage_user_daily",
  "command_logs",
  "moderation_logs",
  "subscriptions",
  "premium_orders",
  "playtime_players",
  "playtime_daily_hot",
  "playtime_daily_archive",
  "bot_logs",
  "console_logs",
  "bot_configs",
];

// Column type mappings: MySQL → PG
const BIGINT_UNSIGNED_COLS: Record<string, string[]> = {
  user_roles: ["discord_id"],
  auto_find: ["discord_id", "guild_id", "channel_id", "message_id"],
  server_configs: ["created_by"],
  server_activity: ["discord_id", "guild_id"],
  server_activity_daily: ["guild_id"],
  server_change_requests: ["requested_by", "decided_by"],
  server_logs: ["discord_id", "guild_id"],
  steam_player_ranks: ["owner_discord_id"],
  command_usage_daily: ["guild_id"],
  command_usage_user_daily: ["guild_id", "discord_id"],
  command_logs: ["discord_id", "guild_id", "channel_id"],
  moderation_logs: ["discord_id", "guild_id", "channel_id", "message_id"],
  subscriptions: ["discord_id"],
  premium_orders: ["discord_id"],
  playtime_daily_hot: ["player_ref"],
  playtime_daily_archive: ["player_ref"],
  bot_logs: ["guild_id"],
  auto_find: ["discord_id", "guild_id", "channel_id", "message_id"],
};

// TINYINT → boolean columns
const BOOLEAN_COLS: Record<string, string[]> = {
  auto_find: ["enabled"],
  bot_configs: ["enabled"],
};

// ENUM → VARCHAR (already handled by using varchar in PG schema)
// DATETIME/TIMESTAMP → TIMESTAMPTZ (Drizzle handles this)

function convertRow(table: string, row: any): any {
  const converted: any = {};
  for (const [key, value] of Object.entries(row)) {
    const col = key.toLowerCase();

    // Convert BIGINT UNSIGNED to number (PG INT8)
    if (BIGINT_UNSIGNED_COLS[table]?.includes(col)) {
      converted[key] = value != null ? Number(value) : null;
      continue;
    }

    // Convert TINYINT to boolean
    if (BOOLEAN_COLS[table]?.includes(col)) {
      converted[key] = value === 1 || value === true;
      continue;
    }

    // Convert Date strings
    if (value instanceof Date) {
      converted[key] = value.toISOString();
      continue;
    }

    converted[key] = value;
  }
  return converted;
}

// Build INSERT query for PG (with ON CONFLICT DO NOTHING)
function buildPGInsert(table: string, columns: string[]): string {
  const cols = columns.join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
}

// Get column names from result
function getColumnNames(rows: any[]): string[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]);
}

async function migrate() {
  console.log("=== MySQL → CockroachDB/Postgres Migration ===\n");

  // Connect to source (MySQL)
  console.log("Connecting to MySQL source...");
  const mysqlConn = await mysql.createConnection(SOURCE_DSN);
  console.log("  ✓ Connected\n");

  // Connect to target (PG/CRDB)
  console.log("Connecting to target database...");
  const pgPool = new pg.Pool({ connectionString: TARGET_DSN, ssl: { rejectUnauthorized: false } });
  const pgClient = await pgPool.connect();
  console.log("  ✓ Connected\n");

  let totalRows = 0;
  let totalErrors = 0;

  for (const table of TABLES) {
    try {
      // Read from MySQL
      const [mysqlRows] = await mysqlConn.execute(`SELECT * FROM \`${table}\``);
      const rows = mysqlRows as any[];
      const count = rows.length;
      console.log(`[${table}] ${count} rows`);

      if (count === 0) continue;

      // Convert rows
      const columns = getColumnNames(rows);
      const insertSQL = buildPGInsert(table, columns);

      // Insert in batches
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        for (const row of batch) {
          const converted = convertRow(table, row);
          const values = columns.map((col) => converted[col]);
          try {
            await pgClient.query(insertSQL, values);
            inserted++;
          } catch (err: any) {
            console.error(`  ✗ Row error: ${err.message}`);
            totalErrors++;
          }
        }
        process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${count} inserted\r`);
      }

      console.log(`  ✓ ${inserted}/${count} rows migrated`);
      totalRows += inserted;
    } catch (err: any) {
      if (err.code === "ER_NO_SUCH_TABLE") {
        console.log(`  ⚠ Table not found in source, skipping`);
      } else {
        console.error(`  ✗ Error: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n=== Migration complete ===`);
  console.log(`Total rows migrated: ${totalRows}`);
  console.log(`Total errors: ${totalErrors}`);

  await mysqlConn.end();
  pgClient.release();
  await pgPool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
