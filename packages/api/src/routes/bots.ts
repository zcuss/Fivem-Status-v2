import { Hono } from "hono";
import { db } from "@fivem/db";

const bots = new Hono();

// GET /api/bots — list all bot configs (tokens masked)
bots.get("/", async (c) => {
  const [rows] = await db.execute("SELECT * FROM bot_configs ORDER BY id");
  const masked = (rows as any[]).map((r) => ({
    ...r,
    token: r.token ? r.token.slice(0, 8) + "***" : "",
  }));
  return c.json({ ok: true, data: masked });
});

// POST /api/bots — create a new bot config
bots.post("/", async (c) => {
  const body = await c.req.json();
  const { name, token, clientId, enabled = 1, clusterId, features } = body;

  if (!name || !token || !clientId) {
    return c.json({ ok: false, error: "name, token, clientId are required" }, 400);
  }

  const [result] = await db.execute(
    `INSERT INTO bot_configs (name, token, client_id, enabled, cluster_id, features, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'stopped', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [name, token, clientId, enabled ? 1 : 0, clusterId || null, features || "commands,refresh,voice"]
  );

  const [created] = await db.execute("SELECT * FROM bot_configs WHERE id = ?", [result.insertId]);
  return c.json({ ok: true, data: created[0] }, 201);
});

// DELETE /api/bots/:id — delete a bot config
bots.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.execute("DELETE FROM bot_configs WHERE id = ?", [id]);
  return c.json({ ok: true, message: "Bot deleted" });
});

// POST /api/bots/:id/start — set bot status to running
bots.post("/:id/start", async (c) => {
  const id = Number(c.req.param("id"));
  await db.execute(
    "UPDATE bot_configs SET status = 'running', enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
  const [rows] = await db.execute("SELECT * FROM bot_configs WHERE id = ?", [id]);
  if (!rows[0]) return c.json({ ok: false, error: "Bot not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

// POST /api/bots/:id/stop — set bot status to stopped
bots.post("/:id/stop", async (c) => {
  const id = Number(c.req.param("id"));
  await db.execute(
    "UPDATE bot_configs SET status = 'stopped', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
  const [rows] = await db.execute("SELECT * FROM bot_configs WHERE id = ?", [id]);
  if (!rows[0]) return c.json({ ok: false, error: "Bot not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

export default bots;
