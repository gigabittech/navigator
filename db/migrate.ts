/**
 * Apply every SQL file in `./migrations` against the configured database,
 * in lexical order. Idempotent — every migration uses IF NOT EXISTS /
 * CREATE OR REPLACE so re-running is safe.
 *
 * Usage:  pnpm db:migrate
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function main() {
  const sql = postgres(DATABASE_URL, { onnotice: () => {} });
  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migrations.`);
  for (const file of files) {
    console.log(`  → ${file}`);
    const body = readFileSync(join(migrationsDir, file), "utf8");
    await sql.unsafe(body);
  }
  console.log("Done.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
