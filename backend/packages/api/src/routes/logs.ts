import { Hono } from "hono";
import { db } from "@fivem/db";

const logs = new Hono();

// GET /api/logs/commands — command logs
logs.get("/commands", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM command_logs ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/logs/bot — bot logs
logs.get("/bot", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM bot_logs ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/logs/console — console logs
logs.get("/console", async (c) => {
  const limit = Number(c.req.query("limit") || 100);
  const offset = Number(c.req.query("offset") || 0);
  const [rows] = await db.execute(
    "SELECT * FROM console_logs ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  return c.json({ ok: true, data: rows });
});

// GET /api/stats — summary stats
logs.get("/stats", async (c) => {
  const [[{ botCount }]]: any = await db.execute("SELECT COUNT(*) AS botCount FROM bot_configs");
  const [[{ serverCount }]]: any = await db.execute("SELECT COUNT(*) AS serverCount FROM server_configs");
  const [[{ userCount }]]: any = await db.execute("SELECT COUNT(*) AS userCount FROM user_roles");
  const [[{ commandCount }]]: any = await db.execute("SELECT COUNT(*) AS commandCount FROM command_logs");

  return c.json({
    ok: true,
    data: {
      bots: botCount,
      servers: serverCount,
      users: userCount,
      commands: commandCount,
    },
  });
});

export default logs;
