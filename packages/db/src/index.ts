import "dotenv/config";

export type DBType = "sqlite" | "mysql" | "postgres" | "cockroach";

function detectDBType(): DBType {
  const raw = (process.env.DB_TYPE || "mysql").toLowerCase();
  if (raw === "sqlite") return "sqlite";
  if (raw === "postgres" || raw === "postgresql" || raw === "supabase" || raw === "neon") return "postgres";
  if (raw === "cockroach" || raw === "cockroachdb") return "cockroach";
  return "mysql";
}

export const DB_TYPE = detectDBType();
export const isPostgres = DB_TYPE === "postgres" || DB_TYPE === "cockroach";
export const isSQLite = DB_TYPE === "sqlite";
export const isMySQL = DB_TYPE === "mysql";

// ============================================================
// Connection factory
// ============================================================

let _pool: any = null;
let _dialect: any = null;

export async function getPool() {
  if (_pool) return _pool;

  if (isSQLite) {
    const Database = (await import("better-sqlite3")).default;
    const db = new Database(process.env.SQLITE_PATH || "./data/fivem.db");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    _pool = db;
    return _pool;
  }

  if (isMySQL) {
    const mysql = await import("mysql2/promise");
    _pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASS || process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_MAX || 15),
      queueLimit: 0,
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000),
    });
    return _pool;
  }

  // Postgres / CockroachDB
  const pg = await import("pg");
  const connStr = process.env.DATABASE_URL;
  const config: any = connStr
    ? { connectionString: connStr }
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT || 26257),
        user: process.env.DB_USER,
        password: process.env.DB_PASS || process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
  config.max = Number(process.env.DB_POOL_MAX || 15);
  config.idleTimeoutMillis = 30000;
  config.connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);

  if (
    (connStr && (connStr.includes("sslmode=require") || connStr.includes("sslmode=no-verify"))) ||
    process.env.DB_SSL === "true" ||
    (connStr && connStr.includes(".cockroachlabs.cloud")) ||
    (connStr && connStr.includes("supabase")) ||
    (connStr && connStr.includes("neon.tech"))
  ) {
    config.ssl = { rejectUnauthorized: false };
  }

  _pool = new pg.Pool(config);
  return _pool;
}

// ============================================================
// Unified query executor
// ============================================================

// Parameter placeholders: MySQL uses ?, Postgres/CRDB uses $1, $2, ...
// This converts ? to $N for postgres dialect.
function toPGParams(sql: string, params: any[]): { text: string; values: any[] } {
  let i = 0;
  const text = sql.replace(/\?/g, () => `$${++i}`);
  return { text, values: params };
}

// Simple retry for transient errors
const RETRYABLE = new Set([
  "PROTOCOL_SEQUENCE_TIMEOUT", "PROTOCOL_CONNECTION_LOST", "ECONNRESET",
  "ECONNREFUSED", "ETIMEDOUT", "57P01", "57P03", "08000", "08003", "08006",
]);

export async function dbExecute(sql: string, params: any[] = [], retries = 2): Promise<any> {
  const pool = await getPool();

  // SQLite
  if (isSQLite) {
    try {
      if (/^\s*insert/i.test(sql)) {
        const stmt = pool.prepare(sql);
        const result = stmt.run(...params);
        return [[{ insertId: result.lastInsertRowid, affectedRows: result.changes }], []];
      }
      if (/^\s*update|^\s*delete/i.test(sql)) {
        const stmt = pool.prepare(sql);
        const result = stmt.run(...params);
        return [[{ affectedRows: result.changes }], []];
      }
      const stmt = pool.prepare(sql);
      const rows = stmt.all(...params);
      return [rows, []];
    } catch (err: any) {
      throw err;
    }
  }

  // MySQL
  if (isMySQL) {
    for (let attempt = 0; ; attempt++) {
      try {
        const [rows, fields] = await pool.execute(sql, params);
        return [rows, fields];
      } catch (err: any) {
        if (RETRYABLE.has(err.code) && attempt < retries) {
          await sleep(250 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }

  // Postgres / CockroachDB
  const { text, values } = toPGParams(sql, params);
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await pool.query(text, values);
      const rows = result.rows;
      if (rows.length && rows[0]?.id !== undefined) {
        rows.insertId = rows[0].id;
      }
      return [rows, result.fields];
    } catch (err: any) {
      if (RETRYABLE.has(err.code) && attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Convenience: raw SQL query wrapper (migrates from old config.ts)
// ============================================================

export const db = {
  execute: dbExecute,
  query: dbExecute,
  async getConnection() {
    return getPool();
  },
};

export default db;
