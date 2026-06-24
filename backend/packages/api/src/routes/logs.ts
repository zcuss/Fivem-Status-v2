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
