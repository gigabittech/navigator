import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit reads this to generate + run migrations against the local
 * Supabase Postgres. Schema source of truth: `packages/schema/src/`.
 */
export default {
  schema: "../packages/schema/src/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
  // Hand-written RLS policies live alongside generated migrations.
  // Drizzle won't touch files it didn't create.
  verbose: true,
  strict: true,
} satisfies Config;
