import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import botRoutes from "./routes/bots.js";
import serverRoutes from "./routes/servers.js";
import userRoutes from "./routes/users.js";
import logRoutes from "./routes/logs.js";

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
  const [[{ botCount }]]: any = await db.execute("SELECT COUNT(*) AS botCount FROM bot_configs");
  const [[{ serverCount }]]: any = await db.execute("SELECT COUNT(*) AS serverCount FROM server_configs");
  const [[{ userCount }]]: any = await db.execute("SELECT COUNT(*) AS userCount FROM user_roles");
  const [[{ commandCount }]]: any = await db.execute("SELECT COUNT(*) AS commandCount FROM command_logs");

  return c.json({
    ok: true,
    data: { bots: botCount, servers: serverCount, users: userCount, commands: commandCount },
  });
});

// Health check
app.get("/health", (c) => c.json({ ok: true, status: "running" }));

const port = Number(process.env.API_PORT || 34002);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[API] Listening on http://localhost:${info.port}`);
});
