import { Hono } from "hono";
import { db } from "@fivem/db";

const servers = new Hono();

// GET /api/servers — list all server configs
servers.get("/", async (c) => {
  const [rows] = await db.execute("SELECT * FROM server_configs ORDER BY server_key");
  return c.json({ ok: true, data: rows });
});

// POST /api/servers — create a new server config
servers.post("/", async (c) => {
  const body = await c.req.json();
  const { serverKey, serverCode, createdBy } = body;

  if (!serverKey || !serverCode || !createdBy) {
    return c.json({ ok: false, error: "serverKey, serverCode, createdBy are required" }, 400);
  }

  await db.execute(
    "INSERT INTO server_configs (server_key, server_code, created_by) VALUES (?, ?, ?)",
    [serverKey, serverCode, createdBy]
  );

  const [created] = await db.execute(
    "SELECT * FROM server_configs WHERE server_key = ?",
    [serverKey]
  );
  return c.json({ ok: true, data: created[0] }, 201);
});

// PUT /api/servers/:key — update a server config
servers.put("/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const { serverCode, createdBy } = body;

  const sets: string[] = [];
  const params: any[] = [];

  if (serverCode !== undefined) {
    sets.push("server_code = ?");
    params.push(serverCode);
  }
  if (createdBy !== undefined) {
    sets.push("created_by = ?");
    params.push(createdBy);
  }

  if (sets.length === 0) {
    return c.json({ ok: false, error: "No fields to update" }, 400);
  }

  params.push(key);
  await db.execute(
    `UPDATE server_configs SET ${sets.join(", ")} WHERE server_key = ?`,
    params
  );

  const [rows] = await db.execute(
    "SELECT * FROM server_configs WHERE server_key = ?",
    [key]
  );
  if (!rows[0]) return c.json({ ok: false, error: "Server not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

// DELETE /api/servers/:key — delete a server config
servers.delete("/:key", async (c) => {
  const key = c.req.param("key");
  await db.execute("DELETE FROM server_configs WHERE server_key = ?", [key]);
  return c.json({ ok: true, message: "Server deleted" });
});

export default servers;
