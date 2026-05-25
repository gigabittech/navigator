# Architecture

Single source of truth for how Navigator is built. Pair this with `CLAUDE.md`
(the rules) — this file is the **why**.

---

## The thesis: local-first

Every read and write happens against an on-device database — **PGlite** (WASM
Postgres persisted to IndexedDB). The UI is reactive via `useLiveQuery` from
`@electric-sql/pglite-react`. The parent never waits for the network. "Offline"
is not a special state — it's just normal operation.

```
  Tap "log dose"
    ↓
  Local PGlite INSERT (~5ms)
    ↓
  UI re-renders from useLiveQuery (reactive)
    ↓
  [future] Electric read-shapes sync to Supabase Postgres in background
    ↓
  [future] Co-parent's device receives the row
```

Cross-device sync is **deferred and interface-ready** in `lib/sync/`. When it
lands it changes nothing on the critical path — reads stay local, writes stay
local, the sync layer is a background concern.

---

## The shape of the data

Two patterns:

1. **Mutable records** for setup data — `profiles`, `children`, `medications`,
   `appointments`, `reports`. Edit in place. Standard `UPDATE`.

2. **Append-only events** for log data — `log_events`. Every dose, observation,
   correction is a row. `UPDATE` and `DELETE` are blocked at the DB level
   (Postgres rewrite rules). To "edit" a past entry, emit a `*Corrected` event
   that references the original `id`.

The reason for #2:
- AI report generation needs the *raw* timeline, not a cleaned-up final state.
- HIPAA-style audit trails fall out of the data model for free.
- Co-parents can log independently about the same moment; both observations
  coexist instead of overwriting.

### Projections

The UI never reads raw `log_events` directly (except the timeline view). Instead
`packages/schema/src/projections.ts` folds the event stream into UI-ready
snapshots: `DoseStatusSnapshot`, `AdherenceRate`, etc. Projections are pure
functions of the event window — re-runs are cheap because we only ever project
a bounded window (today, last 7 days, last 90 days).

---

## Why this stack, specifically

| Choice | Why |
|---|---|
| Next.js 14 App Router | Marketing wants SSR, app shell wants CSR — App Router does both from one tree |
| TypeScript strict | The schema is the contract; we want to fail at typecheck |
| Tailwind + design-system preset | Utility-class velocity with the semantic layer enforcing the design system |
| **PGlite** (`@electric-sql/pglite`) | WASM Postgres in the browser, IndexedDB persistence, same SQL dialect as the server Postgres schema. Replaces sunset `wa-sqlite` + `electric-sql@0.12` generation. |
| `@electric-sql/pglite-react` | `PGliteProvider` + `useLiveQuery` — reactive reads with <50ms local latency |
| Electric sync (deferred) | Read-shapes → PGlite + writes-through-Supabase. Interface-ready in `lib/sync`; not wired in MVP. |
| Supabase Postgres + RLS | RLS is the security boundary on the server side. Row-by-row access control (sync phase). |
| Drizzle (server migrations) | Types from schema, raw SQL escape hatch, no migration magic to fight. Client uses raw parameterised SQL. |
| Claude API for narrative | The parent's words plus a clinician-fluent summary — Claude is the right level of careful for clinical context |
| Vercel | Boring, fast, marketing surface gets edge caching for free |

We deliberately did **not** add: React Query (useLiveQuery is reactive),
Zustand (local DB IS the state), date-fns/dayjs (Intl.DateTimeFormat covers
it), or any UI library (the design system primitives are the lib).

---

## Where things live

```
apps/web/
├── app/(marketing)/   SSR routes — /, /story, /waitlist, /sign-in
├── app/(app)/         CSR routes — /today, /timeline, /report, /prep, /settings
├── lib/db/            PGlite init, migrations, queries, mutations
├── lib/sync/          Shape definitions (deferred — interface-ready)
├── lib/auth/          Supabase Auth client wrappers (graceful local mode)
├── lib/ai/            Narrative + transcription callers (credential-gated)
├── lib/pdf/           react-pdf report document (client-side)
├── lib/log/           redact.ts — PII redaction helper
└── lib/pwa/           Service worker registration

packages/design-system/   Tokens, Tailwind preset, React primitives
packages/schema/          Drizzle tables, event types, Zod payloads, projections
packages/report/          Pure 90-day report generator + section logic

db/migrations/            Supabase server migrations (Drizzle-generated + hand-curated)
db/client-migrations/     PGlite client-side DDL (no RLS, no auth FK)

supabase/functions/       Edge functions: generate_narrative, transcribe_voice
```

---

## Performance budget

| Metric | Budget |
|---|---|
| Time to interactive on `/today` (4G simulated) | < 1.5s |
| Dose-log tap → UI update | < 50ms (local INSERT, no excuse) |
| Initial JS bundle (excluding PGlite WASM) | < 250 KB gzipped |

If a PR breaches any budget, it needs explicit justification.

---

## Security model

- **RLS on every table.** (Server/sync phase.) Every read and write filtered by
  `has_child_access(child_id)`.
- **No service-role key in the client.** Anywhere it's needed (Edge Functions
  for Whisper, Claude), it stays server-side.
- **No third-party analytics on the app shell.** Marketing surface only,
  cookieless Plausible.
- **Redaction helper.** `lib/log/redact.ts` strips child name + dose values
  before any analytics or error reporting.

---

## Graceful degradation

The app runs fully without any credentials configured:

| Credential | Without it |
|---|---|
| Supabase URL + anon key | Auth gate disabled; app runs in single-device local mode |
| Supabase SMTP (Resend) | Waitlist signup logs to console; no email sent |
| ANTHROPIC_API_KEY | AI summary section shows "needs backend connection" |
| OPENAI_API_KEY | Voice note tab records but transcription is unavailable |

Add credentials to `.env.local` to activate each layer. No code changes needed.

---

## Roadmap pointers

- **Phase 1 (shipped):** PGlite data layer, medication logging, behavioral
  observations, timeline, 90-day report generation, PDF export, PWA install.
- **Phase 2:** Cross-device sync via Electric read-shapes → PGlite. Voice →
  text (Whisper Edge Fn). AI pattern detection (pgvector). Co-parent sharing UX.
- **Phase 3:** Clinician portal (separate auth scope), payer integrations,
  IEP document parsing.

Detailed plan lives in `docs/plan.md` (mirror of the v2 architecture document).
