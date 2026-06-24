import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import botRoutes from "./routes/bots.js";
import serverRoutes from "./routes/servers.js";
import userRoutes from "./routes/users.js";
import logRoutes from "./routes/logs.js";
import { startBotManager, stopBotManager } from "@fivem/bot/manager";

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

// Health check
app.get("/health", (c) => c.json({ ok: true, status: "running" }));

const port = Number(process.env.API_PORT || 34002);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[API] Listening on http://localhost:${info.port}`);
});

// Start bot manager
const clusterId = process.env.CLUSTER_ID || "default";
startBotManager({ clusterId }).catch((err) => {
  console.error("[BOT] Fatal:", err);
});

process.on("SIGINT", async () => {
  await stopBotManager();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stopBotManager();
  process.exit(0);
});
