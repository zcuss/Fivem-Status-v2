import { Hono } from "hono";
import { db } from "@fivem/db";

const users = new Hono();

// GET /api/users/:discordId — get user roles
users.get("/:discordId", async (c) => {
  const discordId = Number(c.req.param("discordId"));
  const [rows] = await db.execute(
    "SELECT * FROM user_roles WHERE discord_id = ?",
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
    "SELECT * FROM user_roles WHERE discord_id = ?",
    [discordId]
  );

  if (existing[0]) {
    // Update
    const fields: string[] = [];
    const params: any[] = [];

    if (role !== undefined) { fields.push("role = ?"); params.push(role); }
    if (maxAuto !== undefined) { fields.push("max_auto = ?"); params.push(maxAuto); }
    if (roleLabel !== undefined) { fields.push("role_label = ?"); params.push(roleLabel); }
    if (expiresAt !== undefined) { fields.push("expires_at = ?"); params.push(expiresAt); }
    if (discordName !== undefined) { fields.push("discord_name = ?"); params.push(discordName); }
    if (discordUsername !== undefined) { fields.push("discord_username = ?"); params.push(discordUsername); }

    if (fields.length > 0) {
      params.push(discordId);
      await db.execute(
        `UPDATE user_roles SET ${fields.join(", ")} WHERE discord_id = ?`,
        params
      );
    }
  } else {
    // Insert
    await db.execute(
      `INSERT INTO user_roles (discord_id, role, max_auto, role_label, expires_at, discord_name, discord_username)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
    "SELECT * FROM user_roles WHERE discord_id = ?",
    [discordId]
  );
  return c.json({ ok: true, data: rows[0] });
});

export default users;
