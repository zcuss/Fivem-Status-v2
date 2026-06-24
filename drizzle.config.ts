import { defineConfig } from "drizzle-kit";

const DB_TYPE = process.env.DB_TYPE || "mysql";

function getAdapter() {
  switch (DB_TYPE) {
    case "sqlite":
      return { kind: "sqlite" as const, url: process.env.SQLITE_PATH || "./data/fivem.db" };
    case "postgres":
    case "cockroach":
      return { kind: "postgresql" as const, url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}` };
    default:
      return { kind: "mysql" as const, url: `mysql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}` };
  }
}

export default defineConfig({
  schema: "./packages/db/src/schema.ts",
  out: "./drizzle",
  dialect: getAdapter().kind,
  dbCredentials: {
    url: getAdapter().url,
  },
});
