import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import botRoutes from "./routes/bots.js";
import serverRoutes from "./routes/servers.js";
import userRoutes from "./routes/users.js";
import logRoutes from "./routes/logs.js";
import { stopBotManager } from "@fivem/bot/manager";

// NOTE: Bot manager runs in separate process (packages/bot), not here.

const app = new Hono();

// Middleware
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:34001").split(",");
app.use("*", cors({
  origin: (origin) => ALLOWED_ORIGINS.includes(origin || "") ? origin : ALLOWED_ORIGINS[0],
  credentials: true,
}));

// Mount routers
app.route("/api/bots", botRoutes);
app.route("/api/servers", serverRoutes);
app.route("/api/users", userRoutes);
app.route("/api/logs", logRoutes);

// GET /api/user-guilds — guilds the bot is in (with full details for dashboard)
app.get("/api/user-guilds", async (c) => {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return c.json({ ok: false, error: "No DISCORD_TOKEN" }, 500);

  try {
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return c.json({ ok: false, error: `Discord API ${res.status}` }, 502);
    const guilds = await res.json();
    return c.json({ ok: true, guilds });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// GET /api/stats (mounted separately since stats is under /api/logs but also standalone)
app.get("/api/stats", async (c) => {
  // Delegate to the same stats handler
  const { db } = await import("@fivem/db");
  const [[{ botcount }]]: any = await db.execute("SELECT COUNT(*) AS botcount FROM bot_configs");
  const [[{ servercount }]]: any = await db.execute("SELECT COUNT(*) AS servercount FROM server_configs");
  const [[{ usercount }]]: any = await db.execute("SELECT COUNT(*) AS usercount FROM user_roles");
  const [[{ commandcount }]]: any = await db.execute("SELECT COUNT(*) AS commandcount FROM command_logs");

  return c.json({
    ok: true,
    data: { bots: botcount, servers: servercount, users: usercount, commands: commandcount },
  });
});

// GET /api/bot-guilds — list guilds the bot is in
app.get("/api/bot-guilds", async (c) => {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return c.json({ ok: false, error: "No DISCORD_TOKEN" }, 500);
  try {
    const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) return c.json({ ok: false, error: `Discord ${res.status}` }, 502);
    const guilds = await res.json();
    const guildIds = (guilds as any[]).map((g: any) => g.id);
    return c.json({ ok: true, guildIds });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// Health check
app.get("/health", (c) => c.json({ ok: true, status: "running" }));

const port = Number(process.env.API_PORT || 34002);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[API] Listening on http://localhost:${info.port}`);
});

process.on("SIGTERM", async () => {
  await stopBotManager();
  process.exit(0);
});
