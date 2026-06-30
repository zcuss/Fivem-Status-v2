import { Hono } from "hono";
import { db } from "@fivem/db";

const users = new Hono();

// GET /api/users — list all users
users.get("/", async (c) => {
  const [rows] = await db.execute(
    "SELECT * FROM user_roles ORDER BY discord_id"
  );
  return c.json(rows);
});

// GET /api/users/:discordId — get user roles
users.get("/:discordId", async (c) => {
  const discordId = Number(c.req.param("discordId"));
  const [rows] = await db.execute(
    "SELECT * FROM user_roles WHERE discord_id = $1",
    [discordId]
  );
  if (!rows[0]) return c.json({ ok: false, error: "User not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

// PUT /api/users/:discordId — upsert user roles
users.put("/:discordId", async (c) => {
  const discordId = Number(c.req.param("discordId"));
  const body = await c.req.json();
  const { role, maxAuto, roleLabel, expiresAt, discordName, discordUsername } = body;

  const [existing] = await db.execute(
    "SELECT * FROM user_roles WHERE discord_id = $1",
    [discordId]
  );

  if (existing[0]) {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const pushField = (col: string, val: any) => {
      if (val !== undefined) {
        sets.push(`${col} = $${idx}`);
        params.push(val);
        idx++;
      }
    };

    pushField("role", role);
    pushField("max_auto", maxAuto);
    pushField("role_label", roleLabel);
    pushField("expires_at", expiresAt);
    pushField("discord_name", discordName);
    pushField("discord_username", discordUsername);

    if (sets.length > 0) {
      params.push(discordId);
      await db.execute(
        `UPDATE user_roles SET ${sets.join(", ")} WHERE discord_id = $${idx}`,
        params
      );
    }
  } else {
    await db.execute(
      `INSERT INTO user_roles (discord_id, role, max_auto, role_label, expires_at, discord_name, discord_username)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        discordId,
        role || "user",
        maxAuto || 1,
        roleLabel || null,
        expiresAt || null,
        discordName || null,
        discordUsername || null,
      ]
    );
  }

  const [rows] = await db.execute(
    "SELECT * FROM user_roles WHERE discord_id = $1",
    [discordId]
  );
  return c.json({ ok: true, data: rows[0] });
});

// GET /api/users/:discordId/playtime — get user playtime
users.get("/:discordId/playtime", async (c) => {
  const discordId = c.req.param("discordId");
  const serverKey = c.req.query("serverKey");

  let sql = `
    SELECT p.*, pk.player_key, pk.latest_name, pk.latest_player_id
    FROM playtime_daily_hot p
    JOIN playtime_player_keys pk ON p.player_key = pk.player_key
    WHERE pk.latest_player_id = $1`;
  const params: any[] = [discordId];

  if (serverKey) {
    sql += ` AND p.server_key = $2`;
    params.push(serverKey);
  }

  sql += ` ORDER BY p.play_date DESC, p.server_key`;
  const [rows] = await db.execute(sql, params);
  return c.json({ ok: true, data: rows });
});

export default users;
