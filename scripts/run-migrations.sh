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
psql "$DATABASE_URL" -f "$REPO_ROOT/db/migrations/0001_init.sql"
psql "$DATABASE_URL" -f "$REPO_ROOT/db/migrations/0002_rls_policies.sql"

echo "✅ Migrations complete"
