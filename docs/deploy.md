# Deploying Navigator

This document covers everything you need to go from a fresh clone to a live
deployment. The app is designed to work in local-only mode with no credentials,
so you can run it without Supabase during development.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org or `nvm use` (`.nvmrc` pins the version) |
| pnpm | 8+ | `npm i -g pnpm` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| psql | any | Ships with Postgres; or `brew install libpq` |
| Vercel CLI | latest (optional) | `npm i -g vercel` |

---

## Local development

### 1. Copy the env file

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in the Supabase values (see [Supabase setup](#supabase-setup) below), or
leave them blank to run in local-only mode. The app boots and is fully usable
without any credentials — data lives in IndexedDB on the device.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start the dev server

```bash
pnpm dev
```

The app runs at http://localhost:3000.

### 4. Local-only mode (no Supabase)

When `NEXT_PUBLIC_SUPABASE_URL` is not set:

- The auth gate is disabled — you can navigate the app without signing in.
- Data is stored in IndexedDB via PGlite.
- Waitlist signup logs to the console; no email is sent.
- AI features (narrative, voice transcription) show a "not configured" message.

This is intentional. Local mode is the default development and demo state.

---

## Supabase setup

### 1. Create a project

Go to https://app.supabase.com and create a new project. Note your:

- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **Anon key** (under Settings → API → Project API keys)

### 2. Add credentials to `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run migrations

The migrations create the schema and enable RLS on every table.

```bash
# Get the connection string from: Supabase Dashboard → Settings → Database → Connection string (URI)
export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

./scripts/run-migrations.sh
```

This runs `db/migrations/0001_init.sql` then `db/migrations/0002_rls_policies.sql`
in order.

### 4. Link the Supabase CLI

```bash
supabase link --project-ref <your-project-ref>
```

The project ref is the subdomain part of your Supabase URL (e.g. `abcdefgh`).

### 5. Deploy Edge Functions

```bash
./scripts/deploy-edge-functions.sh
```

This deploys `generate_narrative` (Claude-backed clinical narrative) and
`transcribe_voice` (OpenAI Whisper transcription).

### 6. Set Edge Function secrets

The API keys must never appear in the client bundle. Set them as Supabase secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
```

To lock CORS to your production domain (recommended in production):

```bash
supabase secrets set ALLOWED_ORIGIN=https://your-deployment.vercel.app
```

Without `ALLOWED_ORIGIN` set, the functions accept requests from any origin.
This is fine for local development, but you should lock it down in production.

### 7. Configure email (Resend as Supabase SMTP)

Magic link + OTP emails are sent by Supabase Auth. To send them from your own
domain, point Supabase's SMTP at Resend:

1. Add a Resend API key to `.env.local`: `RESEND_API_KEY=re_...`
2. In the Supabase Dashboard, go to **Authentication → SMTP Settings** and fill in:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: your Resend API key
   - Sender email: `hello@yourdomain.com`

Full guide: https://supabase.com/docs/guides/auth/auth-smtp

The SMTP block is also pre-configured in `supabase/config.toml` (commented out)
for local use — uncomment and fill in values there for the local emulator.

---

## Vercel deployment

### 1. Push to GitHub

The repo should be on GitHub. If it isn't:

```bash
git remote add origin https://github.com/your-org/navigator-app.git
git push -u origin main
```

### 2. Import in Vercel

Go to https://vercel.com/new and import the repository. Vercel will detect
Next.js automatically.

### 3. Set environment variables

In Vercel's project settings under **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` | From Supabase Dashboard → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase Dashboard → API |
| `RESEND_API_KEY` | `re_...` | From Resend Dashboard |
| `RESEND_FROM` | `Navigator <hello@yourdomain.com>` | Sender identity for waitlist emails |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `navigator.app` | Optional. Leave blank to disable analytics. |

Do not add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` here — those live in
Supabase Edge Function secrets (see step 6 above).

### 4. Deploy

Vercel deploys automatically on every push to `main`. The first deploy will
run when you save the environment variables.

Preview deploys are created automatically for every pull request.

---

## Testing auth locally

The Supabase CLI includes a local emulator with an email catcher (Inbucket).
This lets you test OTP emails without a real email provider.

### 1. Start the local Supabase stack

```bash
supabase start
```

This starts Postgres on port 54322, the Auth API on port 54321, Studio on
54323, and Inbucket on port 54324.

### 2. Update `.env.local` for local emulator

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key printed by supabase start>
```

### 3. Open Inbucket to read OTP emails

Go to http://localhost:54324 — this is the local email catcher. When you
sign in with a magic link or 6-digit OTP in local dev, the email lands here.

### 4. Stop the local stack

```bash
supabase stop
```

---

## Environment variables reference

| Variable | Required | Where to find it | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For auth + sync | Supabase Dashboard → Settings → API | Leave blank for local-only mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth + sync | Supabase Dashboard → Settings → API | Safe to expose to browser |
| `NEXT_PUBLIC_ELECTRIC_URL` | No (deferred) | Electric dashboard | Not wired in MVP; leave blank |
| `RESEND_API_KEY` | No | Resend Dashboard | Waitlist emails; also used as Supabase SMTP pass |
| `RESEND_FROM` | No | Your choice | Sender identity for waitlist emails |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No | Your Plausible site slug | Marketing surface only; cookieless |
| `ANTHROPIC_API_KEY` | No — Edge Fn only | Anthropic Console | Set via `supabase secrets set`, never in Vercel |
| `OPENAI_API_KEY` | No — Edge Fn only | OpenAI Dashboard | Set via `supabase secrets set`, never in Vercel |
| `ALLOWED_ORIGIN` | No — Edge Fn only | Your Vercel deployment URL | Set via `supabase secrets set` to lock CORS in production |

---

## Seeding demo data (development only)

To populate a remote Supabase DB with demo data for testing:

```bash
export DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
./scripts/seed-remote.sh
```

This inserts one parent profile, one child, and two medications. It is
idempotent — re-running it is safe.

In local development with PGlite, the seed runs client-side and no script is
needed — the app seeds itself on first boot if the DB is empty.
