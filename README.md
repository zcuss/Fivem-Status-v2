# Fivem-Status v2.0

Multi-bot Discord management system for FiveM servers.

## Structure

```
├── backend/          # API, Bot, Selfbot, DB
│   ├── packages/     # Monorepo packages
│   │   ├── api/      # Hono REST API
│   │   ├── bot/      # Discord bot manager
│   │   ├── db/       # Drizzle ORM (multi-DB)
│   │   ├── selfbot/  # Steam forwarder
│   │   └── shared/   # Types & utils
│   ├── scripts/      # Migration scripts
│   └── .env          # Backend config
│
├── frontend/         # Next.js Dashboard
│   ├── src/          # App Router pages
│   └── .env          # Frontend config
│
└── README.md
```

## Quick Start

```bash
# Backend
cd backend
pnpm install
pnpm build
pnpm start:api    # Port 34002

# Frontend
cd frontend
pnpm install
pnpm dev          # Port 34001
```

## Features

- Multi-Bot Support (1-100+ instances)
- Multi-DB: SQLite, MySQL, CockroachDB, Postgres
- Discord OAuth2 Login
- Server Workspace Management
- Auto-Find, Ranks, Commands
- Steam Selfbot Forwarder
- MySQL → CockroachDB Migration
