# Navigator

> A local-first PWA for parents managing a child's complex psychiatric care.
> Log doses and observations in seconds. Walk into every appointment with a
> one-tap 90-day clinical report.

---

## Repo layout

```
navigator/
├── apps/
│   └── web/                   Next.js 14 — marketing (SSR) + app shell (CSR PWA)
│       ├── app/
│       │   ├── (marketing)/   /, /story, /waitlist
│       │   └── (app)/         /today, /timeline, /report, /prep, /settings
│       └── lib/
│           ├── db/            wa-sqlite client + ElectricSQL wiring
│           ├── sync/          shape definitions, conflict policies
│           └── auth/          Supabase Auth helpers
│
├── packages/
│   ├── design-system/         CSS tokens + Tailwind preset + primitives
│   │   ├── src/tokens.css     ← THE source of visual truth (do not fork)
│   │   ├── src/components/    Button, Pill, Card, SyncDot, Field, TagChip…
│   │   └── src/tailwind-preset.ts
│   │
│   ├── schema/                Drizzle schema + TS types (shared client+server)
│   │   └── src/log-events.ts  Append-only event table — never UPDATE/DELETE
│   │
│   └── report/                Pure 90-day report generator (testable, no I/O)
│
├── db/
│   ├── migrations/            SQL migrations (Drizzle out, hand-written RLS)
│   └── drizzle.config.ts
│
├── .github/workflows/         Typecheck, lint, build on PR
├── CLAUDE.md                  ← Read this if you are an AI assistant
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Quick start

Requires **Node 20** and **pnpm 9+**.

```bash
# 1. Install
pnpm install

# 2. Configure
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, ELECTRIC_URL, ANTHROPIC_API_KEY

# 3. Run the database (Supabase local stack — Docker required)
pnpm db:start
pnpm db:migrate
pnpm db:seed          # optional: a sample child + meds

# 4. Run the app
pnpm dev              # http://localhost:3000
```

Open `http://localhost:3000` for marketing, `http://localhost:3000/today` for the app shell.

---

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run `apps/web` in dev mode (Turbopack) |
| `pnpm build` | Build all packages + apps (Turbo orchestrated) |
| `pnpm typecheck` | TS across the workspace |
| `pnpm lint` | ESLint across the workspace |
| `pnpm test` | Vitest in `packages/report` (and any package with tests) |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:generate` | Generate a new Drizzle migration from schema diff |
| `pnpm ds:dev` | Watch-build the design-system package |

---

## Dokploy

Use the repo root as the build context. This project is a `pnpm` monorepo, and
the Next.js app in `apps/web` depends on workspace packages under `packages/`.
Pointing Dokploy at `apps/web` by itself will fail because those workspace
dependencies are not available there alone.

Recommended Dokploy settings:

- Build Type: `Dockerfile`
- Dockerfile Path: `./Dockerfile`
- Docker Context Path: `.`
- Port: `3000`

If you prefer Dokploy's default `Nixpacks` build type, keep the build path at the
repo root and use the checked-in [nixpacks.toml](./nixpacks.toml). Do not point
the build path at `apps/web`, or the workspace packages under `packages/` will
not be available during the build.

Required environment variables for production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` if you want waitlist emails enabled
- `WAITLIST_FROM` for your sender identity

---

## Architecture in one minute

- **Local-first.** Every read and write hits a local SQLite (wa-sqlite) running in the browser. The UI never waits for the network.
- **ElectricSQL** syncs a per-child shape (filtered by `child_id`) between the local SQLite and Supabase Postgres in the background. CRDT merge → no conflict UI.
- **Event-sourced log tables.** `log_events` is append-only. Every dose, observation, correction is an event. Read models are projections, generated on-device.
- **Reports** are pure functions in `packages/report` — they take an event stream + child profile and produce a structured `Report` object. Rendering is decoupled (PDF, HTML, AI narrative).
- **Voice → text** via Whisper, **AI narrative** via Claude — both behind Supabase Edge Functions so API keys never touch the client.

See `docs/architecture.md` for the full picture (TODO — paste in plan v2).

---

## Design system

All visual tokens live in `packages/design-system/src/tokens.css`. The app pulls them in once at the root:

```ts
// apps/web/app/layout.tsx
import "@navigator/design-system/tokens.css";
```

Component primitives import the tokens via `var(--*)` only. **Do not introduce raw hex colors in `apps/web`.** If a token is missing, add it to `tokens.css` and ship a new version of the package — don't fork.

Light theme is the default. Dark theme via `<html data-theme="dark">`. Persisted via the `useTheme()` hook.

---

## License

Proprietary. © Gigaverse, 2026.
