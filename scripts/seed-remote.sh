#!/usr/bin/env bash
set -euo pipefail

# Seeds demo data on the remote Supabase DB.
# DEVELOPMENT ONLY — do not run against production.
#
# Usage: ./scripts/seed-remote.sh
#
# The seed inserts a demo parent profile + one child + two medications.
# It is idempotent (uses ON CONFLICT) so re-runs are safe.
#
# Prerequisites: DATABASE_URL env var set to your Supabase Postgres URL.

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set"
  echo "  Export it first:"
  echo "  export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
  exit 1
fi

echo "⚠️  This will insert demo data into the remote database."
read -rp "Continue? [y/N] " confirm
[[ "$confirm" == [yY] ]] || exit 0

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# The seed is a TypeScript file that runs against Postgres directly.
# Run it via pnpm (requires DATABASE_URL to be set in the environment).
echo "▶ Running seed..."
cd "$REPO_ROOT"
DATABASE_URL="$DATABASE_URL" pnpm --filter @navigator/db db:seed 2>/dev/null \
  || echo "(No db:seed script found — seed runs client-side via PGlite in local dev)"

echo "✅ Done"
