#!/usr/bin/env bash
set -euo pipefail

# Run Navigator database migrations on Supabase
# Usage: ./scripts/run-migrations.sh
#
# Prerequisites: DATABASE_URL env var set to your Supabase Postgres URL.
# Find it at: Supabase Dashboard → Settings → Database → Connection string (URI)
#
# Example:
#   export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
#   ./scripts/run-migrations.sh

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set"
  echo "  Export it first:"
  echo "  export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ Running migrations..."

# Apply every migration in sorted (numeric) order. All migrations are written to
# be idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS), so
# re-running the whole set on an existing database is safe. -v ON_ERROR_STOP=1
# halts on the first real error instead of plowing ahead.
shopt -s nullglob
migrations=("$REPO_ROOT"/db/migrations/*.sql)
if [ ${#migrations[@]} -eq 0 ]; then
  echo "❌ No migration files found in db/migrations/"
  exit 1
fi

for f in $(printf '%s\n' "${migrations[@]}" | sort); do
  echo "  → $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "✅ Migrations complete (${#migrations[@]} files)"
