import "dotenv/config";
import { Client } from "discord.js-selfbot-v13";
import { db } from "@fivem/db";

// ============================================================
// Config from environment
// ============================================================

const CONFIG = {
  token: process.env.STEAM_SELF_TOKEN || "",
  guildId: process.env.STEAM_GUILD_ID || "",
  channelId: process.env.STEAM_CHANNEL_ID || "",
  readonly: process.env.STEAM_READONLY === "true",
  webhookUrl: process.env.STEAM_FORWARD_WEBHOOK_URL || "",
  backfillDays: Number(process.env.STEAM_BACKFILL_DAYS || 7),
  backfillLimit: Number(process.env.STEAM_BACKFILL_LIMIT || 500),
  ignoreBots: process.env.STEAM_IGNORE_BOTS !== "false",
  allowWebhook: process.env.STEAM_ALLOW_WEBHOOK === "true",
  delayMin: Number(process.env.STEAM_FETCH_DELAY_MS_MIN || 500),
  delayMax: Number(process.env.STEAM_FETCH_DELAY_MS_MAX || 1500),
  forwardOnBackfill: process.env.STEAM_FORWARD_ON_BACKFILL === "true",
};

// ============================================================
// Steam hex line parser
// ============================================================

const STEAM_LINE_RE = /\[([a-fA-F0-9]{40})\]\s*(.+)/;

interface ParsedPlayer {
  steamHex: string;
  playerName: string;
  playerKey: string;
}

function parseSteamLines(content: string): ParsedPlayer[] {
  const results: ParsedPlayer[] = [];
  for (const line of content.split("\n")) {
    const match = line.trim().match(STEAM_LINE_RE);
    if (match) {
      const hex = match[1].toLowerCase();
      const name = match[2].trim();
      results.push({
        steamHex: hex,
        playerName: name,
        playerKey: `steam:${hex}`,
      });
    }
  }
  return results;
}

// ============================================================
// Insert / upsert players into DB
// ============================================================

async function upsertPlayers(players: ParsedPlayer[]): Promise<number> {
  let inserted = 0;
  for (const p of players) {
    try {
      await db.execute(
        `INSERT INTO steam_players (steam_hex, player_name, player_key, last_seen, created_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE player_name = VALUES(player_name), last_seen = NOW()`,
        [p.steamHex, p.playerName, p.playerKey],
      );
      inserted++;
    } catch {
      // Fallback for Postgres syntax
      try {
        await db.execute(
          `INSERT INTO steam_players (steam_hex, player_name, player_key, last_seen, created_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (steam_hex)
           DO UPDATE SET player_name = EXCLUDED.player_name, last_seen = NOW()`,
          [p.steamHex, p.playerName, p.playerKey],
        );
        inserted++;
      } catch (err) {
        console.error(`[selfbot] DB upsert failed for ${p.steamHex}:`, (err as Error).message);
      }
    }
  }
  return inserted;
}

// ============================================================
// Webhook forwarding
// ============================================================

async function forwardToWebhook(players: ParsedPlayer[]): Promise<void> {
  if (!CONFIG.allowWebhook || !CONFIG.webhookUrl) return;
  if (players.length === 0) return;

  const lines = players.map((p) => `\`[${p.steamHex}]\` ${p.playerName}`);
  const content = lines.join("\n");

  // Discord embed field limit ~1024 chars; split if needed
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > 1900) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    try {
      await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chunk }),
      });
    } catch (err) {
      console.error("[selfbot] Webhook forward failed:", (err as Error).message);
    }
  }
}

// ============================================================
// Random delay helper
// ============================================================

function randomDelay(): Promise<void> {
  const ms =
    Math.floor(Math.random() * (CONFIG.delayMax - CONFIG.delayMin + 1)) +
    CONFIG.delayMin;
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Process a batch of messages
// ============================================================

async function processMessages(
  messages: any[],
  isBackfill: boolean,
): Promise<void> {
  let totalPlayers: ParsedPlayer[] = [];

  for (const msg of messages) {
    // Skip bot messages if configured
    if (CONFIG.ignoreBots && msg.author?.bot) continue;

    const players = parseSteamLines(msg.content || "");
    if (players.length > 0) {
      totalPlayers.push(...players);
    }
  }

  if (totalPlayers.length === 0) {
    console.log(
      `[selfbot] ${isBackfill ? "Backfill" : "Live"}: 0 steam lines found`,
    );
    return;
  }

  // Deduplicate by hex
  const seen = new Set<string>();
  const unique = totalPlayers.filter((p) => {
    if (seen.has(p.steamHex)) return false;
    seen.add(p.steamHex);
    return true;
  });

  const inserted = await upsertPlayers(unique);
  console.log(
    `[selfbot] ${isBackfill ? "Backfill" : "Live"}: ${unique.length} players parsed, ${inserted} upserted`,
  );

  // Forward to webhook (not during backfill unless configured)
  if (!isBackfill || CONFIG.forwardOnBackfill) {
    await forwardToWebhook(unique);
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  if (!CONFIG.token) {
    console.error("[selfbot] STEAM_SELF_TOKEN not set, exiting");
    process.exit(1);
  }
  if (!CONFIG.guildId || !CONFIG.channelId) {
    console.error("[selfbot] STEAM_GUILD_ID and STEAM_CHANNEL_ID required");
    process.exit(1);
  }

  console.log("[selfbot] Starting Steam forwarder...");
  console.log(
    `[selfbot] Guild: ${CONFIG.guildId}, Channel: ${CONFIG.channelId}, Readonly: ${CONFIG.readonly}`,
  );

  const client = new Client({});

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[selfbot] ${signal} received, shutting down...`);
    client.destroy();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  client.on("ready", async () => {
    console.log(`[selfbot] Logged in as ${client.user?.tag}`);

    try {
      const guild = await client.guilds.fetch(CONFIG.guildId);
      const channel = await guild.channels.fetch(CONFIG.channelId);
      if (!channel || !("messages" in channel)) {
        console.error("[selfbot] Channel not found or not a text channel");
        client.destroy();
        process.exit(1);
      }

      // ---- Backfill mode ----
      if (CONFIG.backfillDays > 0) {
        console.log(
          `[selfbot] Backfill mode: fetching up to ${CONFIG.backfillLimit} messages from last ${CONFIG.backfillDays} days`,
        );

        const cutoff = Date.now() - CONFIG.backfillDays * 86400000;
        let lastMessageId: string | undefined = undefined;
        let fetched = 0;
        let totalBackfilled = 0;

        while (fetched < CONFIG.backfillLimit) {
          const limit = Math.min(100, CONFIG.backfillLimit - fetched);
          const options: any = { limit };
          if (lastMessageId) options.before = lastMessageId;

          const batch = await (channel as any).messages.fetch(options);
          if (batch.size === 0) break;

          const msgs = Array.from(batch.values());
          // Filter by date cutoff
          const recent = msgs.filter(
            (m: any) => new Date(m.createdAt).getTime() >= cutoff,
          );

          if (recent.length > 0) {
            // Sort oldest-first for DB timestamps
            recent.sort(
              (a: any, b: any) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            await processMessages(recent, true);
            totalBackfilled += recent.length;
          }

          // If all messages in batch are older than cutoff, stop
          const oldest = msgs[msgs.length - 1] as any;
          if (new Date(oldest.createdAt).getTime() < cutoff) break;

          lastMessageId = oldest.id;
          fetched += batch.size;

          await randomDelay();
        }

        console.log(`[selfbot] Backfill complete: ${totalBackfilled} messages processed`);
      }

      // ---- Live listening (if not readonly) ----
      if (!CONFIG.readonly) {
        console.log("[selfbot] Listening for new messages...");

        client.on("messageCreate", async (msg) => {
          if (msg.guild?.id !== CONFIG.guildId) return;
          if (msg.channel.id !== CONFIG.channelId) return;
          if (shuttingDown) return;

          const players = parseSteamLines(msg.content || "");
          if (players.length > 0) {
            const seen = new Set<string>();
            const unique = players.filter((p) => {
              if (seen.has(p.steamHex)) return false;
              seen.add(p.steamHex);
              return true;
            });

            const inserted = await upsertPlayers(unique);
            console.log(
              `[selfbot] Live: ${unique.length} players parsed, ${inserted} upserted`,
            );

            await forwardToWebhook(unique);
          }
        });
      } else {
        console.log("[selfbot] Readonly mode — not listening for live messages");
      }
    } catch (err) {
      console.error("[selfbot] Error during initialization:", err);
      client.destroy();
      process.exit(1);
    }
  });

  client.on("error", (err) => {
    console.error("[selfbot] Client error:", err);
  });

  client.on("disconnect", () => {
    console.warn("[selfbot] Disconnected from Discord");
  });

  await client.login(CONFIG.token);
}

main().catch((err) => {
  console.error("[selfbot] Fatal error:", err);
  process.exit(1);
});
