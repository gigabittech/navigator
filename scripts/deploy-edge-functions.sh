#!/usr/bin/env bash
set -euo pipefail

# Deploy Navigator Edge Functions to Supabase
# Usage: ./scripts/deploy-edge-functions.sh [--project-ref <ref>]
#
# Prerequisites: supabase CLI installed and linked to your project.
# Link first:  supabase link --project-ref <your-project-ref>

echo "▶ Deploying Edge Functions..."
supabase functions deploy generate_narrative
supabase functions deploy transcribe_voice

echo "✅ Edge Functions deployed"
echo ""
echo "Don't forget to set secrets:"
echo "  supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>"
echo "  supabase secrets set OPENAI_API_KEY=<your-openai-key>"
echo ""
echo "To lock CORS to your Vercel deployment:"
echo "  supabase secrets set ALLOWED_ORIGIN=https://your-deployment.vercel.app"
