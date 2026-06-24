# Fivem-Status v2.0

Multi-bot Discord management system for FiveM servers with Next.js dashboard.

## Features

- **Multi-Bot Support** — Run 1-100+ Discord bot instances from a single system
- **Cluster Mode** — Split bots across multiple VPS instances
- **Multi-Database** — SQLite, MySQL, CockroachDB, Postgres, Supabase, Neon
- **Next.js Dashboard** — Modern UI with shadcn components
- **REST API** — Hono-powered API for bot/server/user management
- **Steam Forwarder** — Selfbot for Steam player data collection
- **Migration Tool** — MySQL → CockroachDB data migration

## Architecture

```
fivem-status/
├── packages/
│   ├── db/          # Multi-DB connection layer (Drizzle + raw SQL)
│   ├── shared/      # Types, utils, constants
│   ├── bot/         # Discord bot manager (multi-instance)
│   ├── selfbot/     # Steam forwarder (discord.js-selfbot)
│   └── api/         # REST API (Hono)
├── dashboard/       # Next.js + shadcn UI
├── scripts/         # Migration, deployment scripts
└── drizzle/         # Generated migrations
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your DB credentials and Discord tokens

# Initialize database
pnpm db:push

# Start all services
pnpm dev

# Or start individually
pnpm dev:api        # API on :34002
pnpm dev:dashboard  # Dashboard on :34001
pnpm dev:bot        # Bot manager
pnpm dev:selfbot    # Steam forwarder
```

## Database Configuration

Set `DB_TYPE` in `.env`:

| DB Type | DB_TYPE | Connection |
|---------|---------|------------|
| SQLite | `sqlite` | `SQLITE_PATH=./data/fivem.db` |
| MySQL | `mysql` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` |
| CockroachDB | `cockroach` | `DATABASE_URL=postgresql://...` |
| Postgres | `postgres` | `DATABASE_URL=postgresql://...` |
| Supabase | `postgres` | `DATABASE_URL=postgresql://...supabase.com...` |
| Neon | `postgres` | `DATABASE_URL=postgresql://...neon.tech...` |

## Multi-Bot Setup

Add bots via the dashboard or API:

```bash
curl -X POST http://localhost:34002/api/bots \
  -H "Content-Type: application/json" \
  -d '{"name":"my-bot","token":"DISCORD_TOKEN","clientId":"CLIENT_ID"}'
```

For cluster mode, set `CLUSTER_ID` in `.env` and run separate instances:

```bash
# Instance 1
CLUSTER_ID=cluster-1 pnpm dev:bot

# Instance 2
CLUSTER_ID=cluster-2 pnpm dev:bot
```

## MySQL → CockroachDB Migration

```bash
# Set migration DSNs in .env
MIGRATION_SOURCE_DSN=mysql://user:pass@host:3306/dbname
MIGRATION_TARGET_DSN=postgresql://user:pass@host:26257/dbname?sslmode=no-verify

# Run migration
npx tsx scripts/migrate-mysql-to-crdb.ts
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Bot:** discord.js 14
- **Selfbot:** discord.js-selfbot-v13
- **API:** Hono
- **Dashboard:** Next.js 15 + Tailwind CSS 4
- **DB:** Drizzle ORM (multi-dialect)
- **Package Manager:** pnpm workspaces

## License

MIT
