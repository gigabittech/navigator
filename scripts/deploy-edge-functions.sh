#!/usr/bin/env bash
set -euo pipefail

# Deploy Navigator Edge Functions to Supabase
# Usage: ./scripts/deploy-edge-functions.sh [--project-ref <ref>]
#
# Prerequisites: supabase CLI installed and linked to your project.
# Link first:  supabase link --project-ref <your-project-ref>

echo "▶ Deploying Edge Functions..."

# Browser-invoked functions (the gateway verifies the JWT).
supabase functions deploy generate_narrative
supabase functions deploy transcribe_voice
supabase functions deploy delete_account

# Scheduler-invoked functions (authorized by the x-cron-secret header, not a
# user JWT — see supabase/config.toml verify_jwt = false).
supabase functions deploy send_reminders --no-verify-jwt
supabase functions deploy purge_expired --no-verify-jwt

echo "✅ Edge Functions deployed (5)"
echo ""
echo "Set the required secrets:"
echo "  supabase secrets set ANTHROPIC_API_KEY=<key>      # generate_narrative"
echo "  supabase secrets set OPENAI_API_KEY=<key>         # transcribe_voice"
echo "  supabase secrets set ALLOWED_ORIGIN=https://<your-app>.vercel.app"
echo "  supabase secrets set CRON_SECRET=<random>         # send_reminders, purge_expired"
echo "  supabase secrets set VAPID_PUBLIC_KEY=<pub> VAPID_PRIVATE_KEY=<priv> \\"
echo "                       VAPID_SUBJECT=mailto:alerts@navigator.app   # send_reminders"
echo ""
echo "Then schedule the cron jobs (Supabase Dashboard → Edge Functions → Schedules,"
echo "or pg_cron), calling each function URL with header  x-cron-secret: <CRON_SECRET>:"
echo "  send_reminders  — every 5 minutes"
echo "  purge_expired   — daily"
