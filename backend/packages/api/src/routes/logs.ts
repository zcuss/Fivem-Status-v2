import { Hono } from "hono";
import { db } from "@fivem/db";

const logs = new Hono();

// GET /api/logs — unified log feed (all types combined)
logs.get("/", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const level = c.req.query("level");

  // Union all log types into a common shape
  const parts: string[] = [];
  parts.push(`SELECT id, level, source, message, created_at AS timestamp FROM bot_logs`);
  parts.push(`SELECT id, level, 'console' AS source, message, created_at AS timestamp FROM console_logs`);
  parts.push(`SELECT id, 'info' AS level, command_name AS source, COALESCE(detail, command_name) AS message, created_at AS timestamp FROM command_logs`);
  parts.push(`SELECT id, 'info' AS level, action AS source, COALESCE(detail, action) AS message, created_at AS timestamp FROM server_logs`);

  let sql = parts.join("\n UNION ALL ");
  let params: any[] = [];

  if (level && level !== "all") {
    sql = `SELECT * FROM (${sql}) AS _logs WHERE level = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`;
    params = [level, limit, offset];
  } else {
    sql += " ORDER BY timestamp DESC LIMIT $1 OFFSET $2";
    params = [limit, offset];
  }

  const [rows] = await db.execute(sql, params);
  return c.json(rows);
});

// GET /api/logs/commands — command logs
logs.get("/commands", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM command_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/logs/bot — bot logs
logs.get("/bot", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM bot_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/logs/console — console logs
logs.get("/console", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM console_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/logs/moderation — moderation/hacked logs
logs.get("/moderation", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// POST /api/logs/moderation/clear — clear moderation logs
logs.post("/moderation/clear", async (c) => {
  await db.execute("DELETE FROM moderation_logs");
  return c.json({ ok: true, message: "Moderation logs cleared" });
});

// GET /api/logs/stats — summary stats
logs.get("/stats", async (c) => {
  const [[{ botcount }]]: any = await db.execute("SELECT COUNT(*) AS botcount FROM bot_configs");
  const [[{ servercount }]]: any = await db.execute("SELECT COUNT(*) AS servercount FROM server_configs");
  const [[{ usercount }]]: any = await db.execute("SELECT COUNT(*) AS usercount FROM user_roles");
  const [[{ commandcount }]]: any = await db.execute("SELECT COUNT(*) AS commandcount FROM command_logs");

  return c.json({
    ok: true,
    data: {
      bots: botcount,
      servers: servercount,
      users: usercount,
      commands: commandcount,
    },
  });
});

export default logs;
