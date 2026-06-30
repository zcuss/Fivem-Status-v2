import { Hono } from "hono";
import { db } from "@fivem/db";

const servers = new Hono();

// GET /api/servers — list all server configs
servers.get("/", async (c) => {
  const [rows] = await db.execute("SELECT * FROM server_configs ORDER BY server_key");
  return c.json({ ok: true, data: rows });
});

// GET /api/servers/:key — get a specific server config
servers.get("/:key", async (c) => {
  const key = c.req.param("key");
  const [rows] = await db.execute(
    "SELECT * FROM server_configs WHERE server_key = $1",
    [key]
  );
  if (!rows[0]) return c.json({ ok: false, error: "Server not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

// POST /api/servers — create a new server config
servers.post("/", async (c) => {
  const body = await c.req.json();
  const { serverKey, serverCode, createdBy } = body;

  if (!serverKey || !serverCode || !createdBy) {
    return c.json({ ok: false, error: "serverKey, serverCode, createdBy are required" }, 400);
  }

  await db.execute(
    "INSERT INTO server_configs (server_key, server_code, created_by) VALUES ($1, $2, $3)",
    [serverKey, serverCode, createdBy]
  );

  const [created] = await db.execute(
    "SELECT * FROM server_configs WHERE server_key = $1",
    [serverKey]
  );
  return c.json({ ok: true, data: created[0] }, 201);
});

// PUT /api/servers/:key — update a server config
servers.put("/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const { serverCode, createdBy, voiceChannelId, voiceEnabled, moderationEveryoneMention, moderationAttachmentThreshold, alertsWebhookUrl, alertsConditionMode, reportsChannelId, reportsTime, commandsEphemeral } = body;

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

  pushField("server_code", serverCode);
  pushField("created_by", createdBy);
  pushField("voice_channel_id", voiceChannelId);
  pushField("voice_enabled", voiceEnabled);
  pushField("moderation_everyone_mention", moderationEveryoneMention);
  pushField("moderation_attachment_threshold", moderationAttachmentThreshold);
  pushField("alerts_webhook_url", alertsWebhookUrl);
  pushField("alerts_condition_mode", alertsConditionMode);
  pushField("reports_channel_id", reportsChannelId);
  pushField("reports_time", reportsTime);
  pushField("commands_ephemeral", commandsEphemeral);

  if (sets.length === 0) {
    return c.json({ ok: false, error: "No fields to update" }, 400);
  }

  params.push(key);
  await db.execute(
    `UPDATE server_configs SET ${sets.join(", ")} WHERE server_key = $${idx}`,
    params
  );

  const [rows] = await db.execute(
    "SELECT * FROM server_configs WHERE server_key = $1",
    [key]
  );
  if (!rows[0]) return c.json({ ok: false, error: "Server not found" }, 404);
  return c.json({ ok: true, data: rows[0] });
});

// DELETE /api/servers/:key — delete a server config
servers.delete("/:key", async (c) => {
  const key = c.req.param("key");
  await db.execute("DELETE FROM server_configs WHERE server_key = $1", [key]);
  return c.json({ ok: true, message: "Server deleted" });
});

// GET /api/servers/:key/auto-find — list auto-find entries for a server
servers.get("/:key/auto-find", async (c) => {
  const key = c.req.param("key");
  const [rows] = await db.execute(
    "SELECT * FROM auto_find WHERE server_key = $1 ORDER BY id",
    [key]
  );
  return c.json({ ok: true, data: rows });
});

// POST /api/servers/:key/auto-find — create auto-find entry
servers.post("/:key/auto-find", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const { discordId, keyword, channelId, logo, color } = body;

  if (!discordId || !keyword || !channelId) {
    return c.json({ ok: false, error: "discordId, keyword, channelId required" }, 400);
  }

  const [result] = await db.execute(
    `INSERT INTO auto_find (discord_id, server_key, keyword, channel_id, logo, color, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
    [discordId, key, keyword, channelId, logo || null, color || null]
  );
  return c.json({ ok: true, data: result[0] }, 201);
});

// DELETE /api/servers/:key/auto-find/:id — delete auto-find entry
servers.delete("/:key/auto-find/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.execute("DELETE FROM auto_find WHERE id = $1", [id]);
  return c.json({ ok: true, message: "Auto-find deleted" });
});

// GET /api/servers/:key/ranks — list steam ranks for a server
servers.get("/:key/ranks", async (c) => {
  const key = c.req.param("key");
  const [rows] = await db.execute(
    "SELECT * FROM steam_player_ranks WHERE server_key = $1 ORDER BY id",
    [key]
  );
  return c.json({ ok: true, data: rows });
});

// POST /api/servers/:key/ranks — create rank entry
servers.post("/:key/ranks", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const { rankLabel, steamHex, discordRoleId, discordRoleName, ownerDiscordId } = body;

  if (!rankLabel || !steamHex) {
    return c.json({ ok: false, error: "rankLabel, steamHex required" }, 400);
  }

  const [result] = await db.execute(
    `INSERT INTO steam_player_ranks (server_key, rank_label, steam_hex, discord_role_id, discord_role_name, owner_discord_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [key, rankLabel, steamHex, discordRoleId || null, discordRoleName || null, ownerDiscordId || null]
  );
  return c.json({ ok: true, data: result[0] }, 201);
});

// DELETE /api/servers/:key/ranks/:id — delete rank entry
servers.delete("/:key/ranks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.execute("DELETE FROM steam_player_ranks WHERE id = $1", [id]);
  return c.json({ ok: true, message: "Rank deleted" });
});

export default servers;
