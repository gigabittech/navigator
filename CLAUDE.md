# CLAUDE.md — Read this before writing code

You are working in the Navigator codebase. Read this file end-to-end before
touching anything else. It defines the rules of this repo. Treat it like a
team-mate's onboarding doc, not a suggestion.

---

## What Navigator is

A local-first PWA for parents managing a child's complex psychiatric care (ADHD,
mood disorders, IEPs). The user is under sustained stress; they log in
fragments, often one-handed; they need to walk into appointments prepared.

Two surfaces, one codebase:
- **Marketing** (`apps/web/app/(marketing)`) — SSR, public, waitlist signup
- **App shell** (`apps/web/app/(app)`) — CSR, installable PWA, auth-required

---

## The four rules you do not break

### 1. Local-first. No `await fetch()` on the critical path.
Every read and write goes through the on-device database — **PGlite** (WASM
Postgres, persisted to IndexedDB) — via the `@/lib/db` client. Reads use
`useLiveQuery` (from `@electric-sql/pglite-react`) so the UI is reactive.
Cross-device sync (ElectricSQL read-shapes → PGlite + writes-through-Supabase)
is deferred and interface-ready in `lib/sync`; it changes nothing here when it
lands.

```ts
// ✅ Correct — reactive read from local PGlite, instant
const res = useLiveQuery(
  `SELECT ${EVENT_COLUMNS} FROM log_events WHERE child_id = $1 ORDER BY occurred_at DESC`,
  [childId],
);

// ❌ Wrong — blocks UI on network
const { data } = await supabase.from("log_events").select("*");
```

The only places direct Supabase calls are allowed:
- Auth flows (sign-in / sign-up / sign-out)
- Supabase Edge Function invocations (Whisper, Claude)
- One-off admin scripts in `apps/web/scripts/`

### 2. `log_events` is append-only. Never UPDATE. Never DELETE.
The DB enforces this with rules — your code will fail loudly if you try. To
"edit" a log, emit a `*Corrected` event referencing the original. The
projection layer resolves the final state.

Event types are enumerated in `packages/schema/src/event-types.ts`. Adding a
new event type requires:
1. Add the constant to that file.
2. Add it to the SQL `CHECK` constraint in a new migration.
3. Handle it in the projection in `packages/schema/src/projections.ts`.

### 3. Design tokens come from one place.
Every color, type size, radius, shadow, and motion timing lives in
`packages/design-system/src/tokens.css` as a CSS custom property.

```tsx
// ✅ Correct
<div style={{ background: "var(--surface-card)", color: "var(--fg-1)" }} />
<button className="bg-accent-600 text-white" /> {/* Tailwind via preset */}

// ❌ Wrong
<div style={{ background: "#FFFFFF", color: "#0F172A" }} />
<button className="bg-indigo-600" /> {/* skips the semantic layer */}
```

The Tailwind preset (`packages/design-system/src/tailwind-preset.ts`) maps
utility classes onto the tokens — `bg-surface-card`, `text-fg-2`,
`shadow-md`, `rounded-lg`. Use those. If a token is missing, add it to
`tokens.css` and bump the package — don't reach for a raw hex.

### 4. Voice & tone (yes, this affects code too)
Every user-facing string is **sentence case**, **second person**, **no
exclamation marks**, **no emoji in product UI**. Empty states acknowledge
the hard parts ("Nothing logged today yet. Start with this morning's dose.")
and never use the word "Oops". Error messages tell the user where their data
went ("Couldn't save that. It's still on this device.").

When you write copy, copy the patterns in `docs/voice.md` (TODO if missing —
ask). Don't invent new voice.

---

## Tech stack you must use

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | RSC by default; `"use client"` only when needed |
| Language | TypeScript strict | No `any`, no `// @ts-ignore` without a comment |
| Styling | Tailwind + design-system preset | No CSS Modules, no styled-components |
| Local DB | PGlite (`@electric-sql/pglite`) | WASM Postgres in the browser, persisted to IndexedDB; reactive reads via `@electric-sql/pglite-react` `useLiveQuery` |
| Sync | Deferred — interface-ready in `lib/sync` | Electric read-shapes → PGlite + writes-through-Supabase, added later; not wired in the MVP |
| Remote DB | Supabase Postgres | RLS is mandatory on every table (sync phase) |
| Auth | Supabase Auth (passwordless: magic link + OTP) | `@supabase/ssr` for server, never expose service role; graceful local mode when unconfigured |
| ORM | Drizzle (server migrations) | Client uses raw parameterized SQL + camelCase types from `@navigator/schema` |
| AI — narrative | Claude API (claude-sonnet-4-5) | Behind a Supabase Edge Fn |
| AI — voice | Whisper API | Behind a Supabase Edge Fn |
| PDF | `@react-pdf/renderer` | Client-side render OK, no server PDF |
| Tests | Vitest | Required in `packages/report` |
| Deploy | Vercel | preview per PR |

Do **not** add: React Query, Zustand, Redux, dayjs, lodash, axios, or any
state library. The stack above is the stack.

---

## Folder conventions

### Components

- **Primitive components** (`Button`, `Card`, `Pill`, `SyncDot`, `Field`,
  `TagChip`) live in `packages/design-system/src/components/`. These are
  unstyled-meaning + design-system-styled. They take a `className` and
  forward refs.
- **Feature components** live next to the route that owns them, in a
  `_components` folder. E.g. `apps/web/app/(app)/today/_components/DoseCard.tsx`.
  Underscore prefix = Next.js excludes from routing.
- **Cross-feature components** that aren't generic primitives go in
  `apps/web/components/`. Be honest about whether something is reusable
  before putting it there.

### Data access

- `apps/web/lib/db/client.ts` — the PGlite initialiser (WASM Postgres, IndexedDB persistence).
- `apps/web/lib/db/queries/` — query functions (`getDosesForToday`,
  `getTimelineEvents`). One function per file. They wrap `useLiveQuery`.
- `apps/web/lib/db/mutations/` — mutation functions (`logDoseEvent`,
  `correctDoseEvent`). They INSERT into `log_events`; sync is handled
  out-of-band by the Electric layer (deferred, not wired in MVP).

### Server actions

- Only used for: Edge Function dispatch (report generation, voice
  transcription), Stripe webhooks (later), waitlist signup.
- File pattern: `app/(...)/_actions.ts`. Export `async function ... ()`.
  Mark `"use server"` at top.

---

## Working with the schema

Single source of truth: `packages/schema/src/`. Both the client (Electric
shape definitions) and the server (Drizzle migrations) import from here.

When you add a column:
1. Add to the Drizzle schema in `packages/schema/src/<table>.ts`.
2. Run `pnpm db:generate` from repo root — Drizzle writes a migration to
   `db/migrations/`.
3. **Read the generated SQL.** Add RLS policies for any new table in the
   same migration (Drizzle won't do this for you).
4. Run `pnpm db:migrate` locally.
5. Update the Electric shape in `apps/web/lib/sync/shapes.ts` if the new
   column is client-visible.

---

## Tests

Required:
- `packages/report` — every projection and every section generator has a
  unit test. The report is the product's promise; bugs here are bugs in
  what a clinician sees.
- Migrations have a smoke test that runs them up + down against a temp DB.

Not required (but welcome):
- Component-level tests. Storybook is on the roadmap; until then,
  visual review is enough.

Run: `pnpm test`. CI fails on any test failure or coverage drop in
`packages/report`.

---

## Performance budget

- Time to interactive on the `/today` route, 4G simulated: **< 1.5s**
- Dose-log tap to UI update: **< 50ms** (it's a local INSERT — there's no
  excuse)
- Bundle for the app shell (excluding PGlite WASM): **< 250 KB gzipped**

If you add a dependency that breaks any of these, justify it in the PR.

---

## Accessibility

- WCAG AA minimum. Token pairs in `tokens.css` are verified — using them
  correctly gets you most of the way.
- Every interactive element has a visible focus ring. Don't remove
  `outline` without replacing it.
- 44px minimum tap target on touch. The design system's `Button` enforces
  this — don't reinvent buttons with smaller hitboxes.
- Status is never communicated by color alone. Pair every color with an
  icon or label.

---

## Security

- **RLS on every table.** A migration that creates a table without an
  RLS policy is a bug. CI checks for `ALTER TABLE ... ENABLE ROW LEVEL
  SECURITY;` in every new migration that contains `CREATE TABLE`.
- **Never log PII.** No child names, no dose data, no observations in
  console.log, in error reports, in analytics. The redaction helper is
  `lib/log/redact.ts` — use it.
- **No third-party analytics on the app shell.** Marketing surface only,
  and only Plausible (cookieless).
- **Secrets** live in Supabase Edge Function env, never in
  `NEXT_PUBLIC_*`. The only `NEXT_PUBLIC_` vars are the Supabase URL +
  anon key + Electric URL.

---

## When you're stuck

- Stuck on schema design? Read `uploads/01_Navigator_LocalFirst_Plan.md`
  (in the design-system project, copied into `docs/plan.md` here if
  imported). It has the full event taxonomy and rationale.
- Stuck on a visual? Open `packages/design-system/preview/` — there are
  20 design-system preview cards.
- Stuck on voice? Re-read the "Voice & tone" section above. If a string
  feels generic, it is. Rewrite it specific.
- Stuck on what to build next? Check `docs/roadmap.md` (TODO).

---

## Commit & PR conventions

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- One concern per PR. A schema change + a UI change + a new dep = three PRs.
- PR description must include: what changed, why, screenshots for any UI,
  and a checklist confirming RLS + tests + a11y where relevant. Template
  in `.github/PULL_REQUEST_TEMPLATE.md`.
