# Deploying Navigator

From a fresh clone to a live deployment on **Supabase + Vercel**. The app runs in
local-only mode with no credentials, so you can develop without Supabase.

---

## One-shot deploy checklist

```
[ ] 1. Create a Supabase project; note the URL + anon key + service_role key
[ ] 2. Apply ALL migrations:        ./scripts/run-migrations.sh   (DATABASE_URL set)
[ ] 3. Link the CLI:                supabase link --project-ref <ref>
[ ] 4. Deploy ALL edge functions:   ./scripts/deploy-edge-functions.sh
[ ] 5. Set edge-function secrets (see §"Edge Function secrets")
[ ] 6. Schedule the two cron jobs   (send_reminders 5-min, purge_expired daily)
[ ] 7. Configure email (Resend → Supabase SMTP)
[ ] 8. Push to GitHub; import in Vercel; set Vercel env vars (see §"Vercel")
[ ] 9. Lock CORS:                   supabase secrets set ALLOWED_ORIGIN=https://<app>.vercel.app
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | `nvm use` (`.nvmrc` pins it) |
| pnpm | 9+ | `npm i -g pnpm` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| psql | any | `brew install libpq` |
| Vercel CLI | optional | `npm i -g vercel` |

---

## Local development

```bash
cp apps/web/.env.example apps/web/.env.local   # fill in, or leave blank for local mode
pnpm install
pnpm dev                                        # http://localhost:3000
```

**Local-only mode** (no `NEXT_PUBLIC_SUPABASE_URL`): the auth gate is off, data
lives in IndexedDB (PGlite), the demo dataset (one child "Wren", a co-parent, a
week of events) seeds on first boot, and AI/voice show a "not configured" state.
This is the default dev + demo state. A real signed-in user does **not** get the
demo seed — they start empty and are routed to onboarding.

---

## Supabase setup

### 1. Create a project
At https://app.supabase.com. Note the **Project URL**, **anon key**, and
**service_role key** (Settings → API).

### 2. Apply migrations (ALL of them)
```bash
export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
./scripts/run-migrations.sh
```
The script applies **every** file in `db/migrations/*.sql` in order (0001→0011):
schema, RLS on every table, append-only triggers, the sync outbox + push +
audit-log + rate-limit tables, and the `handle_new_user` profile trigger. All
migrations are idempotent, so re-running is safe.

### 3. Link the CLI
```bash
supabase link --project-ref <your-project-ref>   # the subdomain of your Supabase URL
```

### 4. Deploy Edge Functions (all five)
```bash
./scripts/deploy-edge-functions.sh
```
Deploys: `generate_narrative`, `transcribe_voice`, `delete_account` (JWT-verified,
browser-invoked) and `send_reminders`, `purge_expired` (`--no-verify-jwt`,
scheduler-invoked via the `x-cron-secret` header).

### 5. Edge Function secrets
API keys never appear in the client bundle — set them as Supabase secrets:
```bash
# AI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # generate_narrative
supabase secrets set OPENAI_API_KEY=sk-...             # transcribe_voice
# CORS (lock to your deployment; fail-closed in production)
supabase secrets set ALLOWED_ORIGIN=https://<your-app>.vercel.app
# Cron auth (shared by send_reminders + purge_expired)
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
# Web Push (dose reminders) — generate once: npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=<pub> VAPID_PRIVATE_KEY=<priv> \
                     VAPID_SUBJECT=mailto:alerts@navigator.app
```
The VAPID **public** key also goes in Vercel as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
(so the client can subscribe).

### 6. Schedule the cron jobs
In **Supabase Dashboard → Edge Functions → Schedules** (or pg_cron), invoke each
function URL with header `x-cron-secret: <CRON_SECRET>`:

| Function | Cadence | Purpose |
|---|---|---|
| `send_reminders` | every 5 minutes | dose reminders via Web Push |
| `purge_expired` | daily | retention purge (waitlist 12mo, reports 2yr, voice transcripts 90d, rate-limit cleanup) |

### 7. Email (Resend → Supabase SMTP)
Magic-link + OTP emails are sent by Supabase Auth. Point its SMTP at Resend:
Dashboard → Authentication → SMTP Settings → host `smtp.resend.com`, port `465`,
user `resend`, password = your Resend API key, sender = `hello@yourdomain.com`.

---

## Vercel deployment

1. Push to GitHub; import the repo at https://vercel.com/new (Next.js auto-detected).
2. Set **Environment Variables**:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → API (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only; waitlist writes. NEVER `NEXT_PUBLIC` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | for push | public half of the VAPID pair |
| `RESEND_API_KEY` | optional | waitlist confirmation emails |
| `WAITLIST_FROM` | optional | sender identity |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | optional | cookieless analytics (GPC-gated) |
| `NEXT_PUBLIC_ELECTRIC_URL` | optional | Electric streaming-sync upgrade only. Base two-way sync (pull on sign-in + periodic push) runs on plain Supabase with no extra config. |
| `PREVIEW_PASSWORD` | pre-launch | one shared password gating the WHOLE site (/preview-access). Unset it to launch publicly |

Do **not** put `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `VAPID_PRIVATE_KEY` /
`CRON_SECRET` in Vercel — those live in Supabase Edge Function secrets.

Vercel deploys on every push to `main`; preview deploys per PR. The security
headers (CSP, HSTS, COOP/COEP, X-Frame, Referrer) ship from `next.config.mjs`.

---

## Signing in

The marketing site's "Sign in" link goes to `/sign-in` — passwordless email
OTP via Supabase Auth (enter your email, type the 6-digit code from the
message). New users get a `profiles` row automatically (the `handle_new_user`
trigger) and are routed through onboarding on first sign-in. Sign out lives in
Settings.

---

## Testing auth locally (Supabase emulator)

```bash
supabase start                       # Postgres :54322, Auth :54321, Studio :54323, Inbucket :54324
# .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed by supabase start>
# Read OTP emails at http://localhost:54324 (Inbucket)
supabase stop
```

---

## Seeding demo data on a remote DB (dev only)
```bash
export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
./scripts/seed-remote.sh             # idempotent: one parent, one child, two meds
```
In local PGlite the seed runs client-side automatically on first boot.
