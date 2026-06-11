# Navigator — Master Proposal & Engineering Dossier

> A local-first progressive web application for parents managing a child's
> complex psychiatric care. Log doses and observations in seconds; walk into
> every appointment with a one-tap, 90-day clinical report.
>
> **Powered by NovaSapien Labs** · In partnership with CU Boulder — Innovation &
> Entrepreneurship · CTIA Wireless Foundation Catalyst.

This document is the single source of truth for the product: what it is, what
has been built, what is planned, the technology stack, the infrastructure, and
the compliance posture. It is written to seed a formal proposal document.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The problem & who it serves](#2-the-problem--who-it-serves)
3. [The product — what Navigator does](#3-the-product--what-navigator-does)
4. [Technology stack](#4-technology-stack)
5. [Architecture](#5-architecture)
6. [Data model & event sourcing](#6-data-model--event-sourcing)
7. [Security & privacy](#7-security--privacy)
8. [Regulatory & compliance framework](#8-regulatory--compliance-framework)
9. [Accessibility](#9-accessibility)
10. [Infrastructure & deployment](#10-infrastructure--deployment)
11. [Quality engineering — tests, CI, performance](#11-quality-engineering)
12. [What we have built (delivery log)](#12-what-we-have-built)
13. [What is planned (roadmap)](#13-what-is-planned)
14. [Risk register](#14-risk-register)
15. [Appendix — file & route inventory](#15-appendix)

---

## 1. Executive summary

Navigator turns the invisible labor of managing a child's complex psychiatric
care into a single, calm, local-first workflow. A parent logs medications,
behaviors, side effects, and school incidents in seconds — often one-handed,
under stress — and Navigator produces a structured, clinician-fluent 90-day
report with one tap.

**Status: Phase 1 MVP is shipped and production-hardened.** The application is
built, tested (86 unit tests + 5 end-to-end suites, all green), security- and
accessibility-hardened, responsive from a 320 px phone to a wide desktop, and
deployable to Supabase + Vercel. Phase 2 features (cross-device sync, co-parent
sharing, dose-reminder push) are built as gated, deploy-ready scaffolds.

| Metric | Value |
|---|---|
| Average psychiatrist visit | 15 minutes |
| Typical gap between appointments | 30–90 days |
| Medications tracked | 150+ across every major class |
| Taps to generate a 90-day clinical report | 1 |
| Wireless dependency for core logging | Zero (local-first) |
| Phase 1 build status | Shipped & hardened |
| `/today` route initial JS | 199 KB (budget: 250 KB) |
| Dose-log tap → UI update | < 50 ms (local INSERT) |

The architecture rests on three non-negotiable commitments: **local-first**
(every read/write hits an on-device database; the network is never on the
critical path), **event-sourced** (log tables are append-only; corrections are
new events; the audit trail *is* the data model), and **server-bounded** (auth
tokens, AI keys, and the sync engine live behind a server boundary; the browser
never holds a secret and AI payloads are pseudonymized).

---

## 2. The problem & who it serves

A parent of a child on a multi-medication psychiatric regimen becomes, in
effect, an unpaid case manager. The child's story — what changed, when, and what
it correlated with — ends up scattered across a pill organizer, a calendar,
teacher emails, a notes app, and the parent's memory. None of those were
designed for it.

- **15-minute appointments.** Ninety days of life compressed into a vague verbal
  summary recalled from twelve sticky notes.
- **30–90 day gaps.** A great deal happens, and is forgotten, between visits.
- **~70% of patterns missed.** Wear-off windows, trigger clusters, and
  sleep–mood links go unseen without a system to surface them.

**Primary user:** the primary caregiver of a child (roughly ages 4–18) with a
complex, evolving psychiatric regimen — under sustained stress, logging in
fragments, who needs to arrive at the next appointment prepared.

**Secondary users (planned):** co-parents and caregivers who share the record;
clinicians who receive the generated report; school counselors and IEP case
managers (via shared reports).

**Underserved populations the local-first design directly serves:** families in
rural areas where specialists are scarce and connectivity is unreliable;
low-income families (a permanent free tier; no paid-software barrier);
single-parent households; non-English-speaking caregivers (multilingual planned).

---

## 3. The product — what Navigator does

Two surfaces, one codebase:

- **Marketing** (`apps/web/app/(marketing)`) — SSR, public; waitlist signup,
  story, legal, accessibility statement.
- **App shell** (`apps/web/app/(app)`) — CSR, installable PWA, auth-gated.

### Core features (shipped)

| Feature | Description |
|---|---|
| **Medication tracker** | 150+ medications across every major class (stimulants, non-stimulants, mood stabilizers, antipsychotics, SSRIs/SNRIs). One-tap dose outcomes — taken / late / missed / refused. Concurrent regimens on one timeline. UI updates in < 50 ms. |
| **Today** | Live dose schedule projected from the event log; one-tap outcome chips; optimistic local INSERT. |
| **Timeline** | Reverse-chronological event stream with sticky date headers, "corrected" badges, and per-row "logged by" attribution. |
| **Clinical report** | One tap generates a 90-day summary — adherence, behavioral episodes, trigger patterns, school observations, notable changes — each with a typed headline stat and an honest "on track" / "review" signal derived from the data (never invented). Exports to PDF on-device. Carries a clinical-boundary disclaimer. |
| **Prep** | Next-appointment summary, adherence window, top tags — derived from real events (no fabricated advice). |
| **Patterns** | Three data-driven charts: wear-off window (by hour), adherence trend, trigger clusters (30-day). Fluid/responsive. |
| **Voice notes** | MediaRecorder → Whisper transcription behind a server function; raw audio is never stored; the transcript becomes a structured event. |
| **AI narrative** | Claude-backed clinical summary of the structured report. The payload is pseudonymized (age range + diagnosis category + medication class — never name, DOB, or free-text notes). |
| **Onboarding** | Five-step first-run flow (child → medications → reminders → done), gated so new users are routed in. |
| **Settings** | Medication CRUD, light/dark theme, full data export (JSON), account deletion, co-parent management, dose-reminder toggle, optional two-factor setup. |
| **PWA** | Installable; manifest, icons (192/512/maskable + apple-touch), service worker with app-shell cache, offline fallback, and a calm update flow. Works fully offline for all logging/reporting. |

---

## 4. Technology stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.18 | RSC by default; `"use client"` only where needed |
| **Language** | TypeScript (strict) | 5.6 | No `any`, no un-commented `@ts-ignore` |
| **UI runtime** | React / React DOM | 18.3 | |
| **Styling** | Tailwind CSS + design-system preset | 3.4 | One token source; no raw hex, no bare palette |
| **Icons** | lucide-react | 0.456 | |
| **Local database** | PGlite (WASM Postgres) | 0.3.6 | Persisted to IndexedDB; reactive reads |
| **Reactive reads** | @electric-sql/pglite-react `useLiveQuery` | 0.2.34 | UI is a live projection of the local DB |
| **Sync (Phase 2)** | ElectricSQL read-shapes → PGlite + writes-through-Supabase | — | Interface built; activation gated on an Electric service + a PGlite 0.4 bump |
| **Remote database** | Supabase Postgres | — | RLS on every table; HIPAA-eligible with BAA |
| **Auth** | Supabase Auth (`@supabase/ssr`) | 0.5.2 / supabase-js 2.45 | Passwordless magic link + 6-digit OTP; optional TOTP 2FA |
| **AI — narrative** | Claude API (`claude-sonnet-4-5`) | — | Behind a Supabase Edge Function |
| **AI — voice** | OpenAI Whisper API | — | Behind a Supabase Edge Function; audio never stored |
| **PDF** | @react-pdf/renderer | 4.1 | Client-side render; no server PDF |
| **Validation** | Zod | 3.23 | Event payloads + every edge-function boundary |
| **Email** | Resend | 4.0 | Waitlist + (via Supabase SMTP) auth emails |
| **Push** | Web Push API (VAPID) | — | Dose reminders; iOS 16.4+ |
| **Tests** | Vitest + Playwright | 2.1 / 1.44 | Unit + e2e |
| **Deploy** | Vercel (app) + Supabase (DB/auth/functions) | — | Preview per PR |
| **Analytics** | Plausible (cookieless, GPC-gated) | — | Marketing surface only |

**Explicitly not used:** React Query, Zustand, Redux, dayjs, lodash, axios, or
any state-management library. State is the local database (via `useLiveQuery`)
plus small `useState`/`useSyncExternalStore` where needed.

### Monorepo packages

| Package | Role |
|---|---|
| `@navigator/web` (`apps/web`) | The Next.js app — marketing + app shell |
| `@navigator/design-system` | CSS tokens, Tailwind preset, primitive components (Button, Card, Field, Pill, SyncDot, TagChip) |
| `@navigator/schema` | Drizzle schema + TS types + event taxonomy + Zod payloads + projections (shared client/server) |
| `@navigator/report` | Pure, I/O-free 90-day report generator + pseudonymization (trivially testable, runs in browser, edge fn, and tests) |

---

## 5. Architecture

Navigator is built on three architectural commitments that are not negotiable:

### Local-first
Every read and write hits an on-device database first — **PGlite**, a build of
Postgres compiled to WebAssembly, persisted to the browser's IndexedDB. The
interface never waits on the network; a dose log is an instant local INSERT.
Reads are reactive via `useLiveQuery`, so the UI is a live projection of the
local database. Cross-device sync layers on top later and changes nothing on the
critical path.

### Event-sourced
The core log table (`log_events`) is **append-only**. To "edit" a past entry,
the app emits a `*Corrected` event referencing the original; a projection layer
resolves the final state. This is enforced at the database with triggers that
`RAISE EXCEPTION` on any UPDATE or DELETE — the append-only guarantee is a hard
invariant, not a convention. The full history of what was logged, when, and by
whom is always available, which is both a product feature and a compliance one.

### Server-bounded
Authentication tokens, AI provider keys, and the sync engine operate behind a
server boundary (Supabase Edge Functions). The browser never holds a secret. AI
payloads are minimized and pseudonymized before they leave the boundary.

```
  ┌─────────────────────────── Device (browser / PWA) ───────────────────────────┐
  │  React UI  ──useLiveQuery──▶  PGlite (WASM Postgres in IndexedDB)             │
  │     │  one-tap write (< 50 ms, append-only)         ▲                          │
  │     ▼                                               │ reactive projection     │
  │  Service Worker (offline shell, push)               │                          │
  └───────────────────────────────│────────────────────┼──────────────────────────┘
                                   │ writes-through (outbox)   ▲ read-shapes (Electric)
                                   ▼                           │  [Phase 2, gated]
  ┌──────────────────────────── Supabase ──────────────────────────────────────────┐
  │  Postgres (RLS on every table)   Auth (OTP/magic-link/TOTP)                      │
  │  Edge Functions (server-bounded):                                               │
  │    generate_narrative → Claude    transcribe_voice → Whisper (audio discarded)  │
  │    delete_account    send_reminders (cron)    purge_expired (cron)              │
  │  Shared: auth · validate (Zod) · rateLimit · audit · cors · redact              │
  └─────────────────────────────────────────────────────────────────────────────────┘
        Vercel hosts the Next.js app · Resend sends email · Plausible (cookieless)
```

---

## 6. Data model & event sourcing

### Tables (11, all RLS-enabled on the server)

| Table | Purpose |
|---|---|
| `profiles` | A user (auto-created on signup via trigger) |
| `children` | A child record (owner-scoped) |
| `child_collaborators` | Co-parent / clinician-view links |
| `medications` | Per-child medication records |
| `log_events` | **The append-only event log** — the heart of the system |
| `appointments` | Upcoming/past appointments |
| `reports` | Generated 90-day reports |
| `push_subscriptions` | Per-device Web Push subscriptions |
| `audit_log` | **Append-only HIPAA access trail** — service-role read only, 7-year retention |
| `rate_limits` | Per-(user, function) fixed-window counters |
| `waitlist_entries` | Marketing waitlist (server-only) |

### Event taxonomy (22 types)

The log models everything as typed events with validated payloads:

- **Medication:** `MedicationDoseScheduled`, `MedicationDoseTaken`,
  `MedicationDoseMissed`, `MedicationDoseRefused`, `MedicationDoseLate`,
  `MedicationDoseVomited`, `MedicationDoseCorrected`, `MedicationStarted`,
  `MedicationStopped`, `MedicationDoseAdjusted`
- **Behavior:** `BehaviorObserved`, `MoodLogged`, `EnergyLogged`,
  `TriggerIdentified`, `VoiceEntryTranscribed`
- **School:** `SchoolIncidentLogged`, `TeacherNoteReceived`, `IEPMeetingLogged`
- **Observation:** `WearOffWindowObserved`, `SideEffectObserved`,
  `SleepQualityLogged`, `AppetiteLogged`

Each event carries: `child_id`, `logged_by` (for attribution), `event_type`,
a JSONB `payload` validated by a Zod schema, `occurred_at`, a per-device
`client_id`, and a monotonic `sequence_num`. Adding an event type is a
disciplined three-step change (constant → SQL CHECK constraint → projection).

### Append-only enforcement
- DB triggers `RAISE EXCEPTION` on UPDATE/DELETE of `log_events` and `audit_log`.
- `UNIQUE(child_id, sequence_num)` guards the per-child stream; a separate
  `UNIQUE(client_id, sequence_num)` makes the sync outbox idempotent.
- The on-device schema mirrors the server's append-only behavior so projections
  behave identically on both.

---

## 7. Security & privacy

Security operates under a single principle: **security as architecture, not
security as policy.** Controls live in the infrastructure, so a developer can't
accidentally bypass them.

### Implemented controls

| Control | Implementation |
|---|---|
| **Transport** | TLS 1.3 + HSTS enforced (prod), no HTTP fallback |
| **Headers** | Content-Security-Policy (no `unsafe-inline` scripts — hashed inline theme script), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, COOP/COEP |
| **At rest** | Supabase-managed AES-256; on-device data in IndexedDB |
| **Row-level security** | RLS on every server table; every query scoped to `auth.uid()`; `has_child_access()` / `has_child_write_access()` predicates (clinician-view excluded from writes) |
| **Edge-function authz** | Each function re-resolves the user and authorizes the payload against the child (not just JWT presence) under the caller's own RLS context |
| **Input validation** | Zod schemas on every edge-function boundary; reject malformed input with a generic 400 |
| **Rate limiting** | Per-(user, function) fixed-window (`generate_narrative` 10/5 min, `transcribe_voice` 20/5 min); fails open on limiter outage |
| **AI minimization** | Payload pseudonymized to age-range + diagnosis-category + medication-class — never name, DOB, or free-text notes; "pseudonymized, not de-identified" (it remains PHI under BAA) |
| **Voice/biometric** | Raw audio never stored; transcription server-side only; audio discarded immediately after transcription |
| **PII in logs** | A redaction helper; functions log status/category only, never names/notes/audio/transcripts |
| **Audit trail** | Append-only `audit_log` (service-role read only): report generation, transcription, export, account deletion, collaborator changes |
| **Open-redirect guard** | Auth callback validates the `next` param is a safe same-origin relative path |
| **Optional 2FA** | TOTP via Supabase Auth MFA (scaffold; enable per project) |
| **Secrets** | Live only in Supabase Edge Function env / Vercel server env; only the Supabase URL + anon key + VAPID public key are `NEXT_PUBLIC_*` |

### Incident response plan
Detection (Sentry — planned) → Containment (revoke sessions, disable sync in
< 15 min) → Assessment (PHI exposure scope in < 24 h) → Notification (per breach
timelines) → Remediation (patch, test, deploy, document) → Post-incident review
(root cause + control improvement in < 30 days).

---

## 8. Regulatory & compliance framework

Navigator is built to the framework a clinical-grade, consumer-facing pediatric
health tool requires. The architecture (local-first, event-sourced,
server-bounded) maps directly onto these obligations.

| Regime | Posture |
|---|---|
| **HIPAA** | Minimum-necessary AI payloads; append-only correction model satisfies the amendment requirement; RLS = access control; audit log = §164.312(b); BAA with Supabase before any real PHI; 30-day individual breach-notification target |
| **FTC Health Breach Notification Rule** | Navigator is a PHR vendor (medication + behavioral logs = PHR identifiable health info); breach-notification path; §5 commitments are specific, verifiable, technically enforced (no ad-tracking, no data-sale, no AI-training on user data) |
| **COPPA** | App is directed at *adults* (caregivers); data is *about* children but not collected *from* children. NovaSapien applies COPPA's highest standard to all child data as best practice |
| **Colorado Privacy Act + HB24-1130** | Right to access/correct (event model)/delete (cascade)/portability (JSON export); **Global Privacy Control** universal opt-out respected; biometric (voice) heightened controls — transcribe-and-discard |
| **FDA — Software as a Medical Device** | Positioned as **non-device**: care-coordination & wellness; outputs are *informational*, not autonomous clinical recommendations; explicitly does not diagnose, prescribe, or treat. Clinical disclaimer on the report + PDF |
| **Data retention & deletion** | Voice transcripts purge at 90 days; raw audio never stored; waitlist deletes at 12 months; reports at 2 years; audit logs retained 7 years (user-non-deletable). Enforced by the `purge_expired` cron |
| **SOC 2 Type II** | On the roadmap; Supabase provides SOC-2 infrastructure underneath |

---

## 9. Accessibility

Targets **WCAG 2.1 AA** and treats **ADA Title III** as applicable. Built in from
the start, not retrofitted.

- Text contrast ≥ 4.5:1; verified token pairs.
- Full keyboard operability with a visible focus ring on every interactive
  element (all button variants, inputs, dialogs).
- Status never communicated by color alone — every color paired with an icon or
  label.
- 44×44 px minimum touch targets (enforced by the Button primitive).
- Pinch-zoom never disabled (WCAG 1.4.4).
- `prefers-reduced-motion` respected.
- Screen-reader announcements (ARIA live regions) for log confirmations, sync
  status, and report generation; focus trap + restoration in dialogs/sheets.
- **Plain language:** UI + notifications at a Grade-8 reading level; the report is
  calibrated for parent readability while staying useful to a provider.
- A public **accessibility statement** page (`/accessibility`) with the standard,
  the commitments, and an accommodation-request path.

---

## 10. Infrastructure & deployment

### Topology
- **Vercel** hosts the Next.js app (SSR marketing + CSR app shell). Preview
  deploys per pull request; production on push to `main`. Security headers ship
  from `next.config.mjs`.
- **Supabase** provides Postgres (with RLS), Auth, and Edge Functions (Deno).
- **Resend** sends transactional email (waitlist; auth via Supabase SMTP).
- **Plausible** (cookieless, GPC-gated) on the marketing surface only.
- **Sentry / PostHog** — planned (error tracking + product analytics).

### Edge Functions (5, Deno)
| Function | Invocation | Purpose |
|---|---|---|
| `generate_narrative` | browser (JWT) | Claude clinical summary (pseudonymized payload) |
| `transcribe_voice` | browser (JWT) | Whisper transcription (audio discarded) |
| `delete_account` | browser (JWT) | Cascade-delete PHI; preserve audit log |
| `send_reminders` | cron (x-cron-secret) | Dose reminders via Web Push (~5 min) |
| `purge_expired` | cron (x-cron-secret) | Retention purge (daily) |
| _shared | — | `auth`, `validate` (Zod), `rateLimit`, `audit`, `cors`, `redact` |

### Deployment surface (automated by scripts)
- `scripts/run-migrations.sh` — applies **all 11** migrations in order
  (idempotent).
- `scripts/deploy-edge-functions.sh` — deploys **all 5** functions with correct
  JWT flags and prints the secret + cron checklist.
- `docs/deploy.md` — full runbook: one-shot checklist, all secrets
  (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ALLOWED_ORIGIN`, `VAPID_*`,
  `CRON_SECRET`, `DEV_LOGIN_*`), the two cron schedules, and the Vercel env table.

### Dev access (the `/dev` backdoor)
The marketing site exposes only "Join the waitlist" — there is no public link
into the app. For the team, the hidden **`/dev`** route provides single-click
login: it mints a real Supabase session for a fixed dev user via the service
role (no OTP email), landing on `/today`. It is **fail-closed** — a hard 404
unless `DEV_LOGIN_ENABLED` + `DEV_LOGIN_SECRET` + `DEV_LOGIN_EMAIL` are set
(server-only). In real production those stay unset and the door does not exist.

### Local mode
With no Supabase credentials, the app runs fully on-device: auth gate disabled,
demo dataset seeds on first boot, AI/voice show a calm "not configured" state.
This is the default development and demo state. A *real* signed-in user never
gets the demo seed — they start empty and are routed to onboarding.

---

## 11. Quality engineering

### Tests (all green)
- **86 unit tests** (Vitest): `@navigator/schema` 42 (projections, payloads,
  migration smoke), `@navigator/report` 21 (generators, pseudonymization — incl.
  a no-PII-leak assertion), `@navigator/web` 23 (mutations, collaborators).
- **5 end-to-end suites** (Playwright): dose-log, golden-path, onboarding,
  report, settings.
- Required coverage on `@navigator/report` (gated at 95%); a migration up/idempotency
  smoke test.

### Continuous integration (GitHub Actions, 2 jobs)
1. **`typecheck · lint · test · build`** — format check, typecheck, lint
   (including no-raw-hex / no-bare-palette / voice lint rules), tests, production
   build. Plus an **RLS check** asserting every new `CREATE TABLE` migration
   enables row-level security.
2. **`e2e (Playwright)`** — installs Chromium, runs the end-to-end suites in
   local-mode.

### Performance
- `/today` initial JS **199 KB** (budget 250 KB) — PGlite WASM and
  @react-pdf/renderer load off the critical path; the voice recorder is
  dynamically imported.
- Dose-log tap → UI update **< 50 ms** (local INSERT, no network).
- Single coherent boot skeleton (no hydration "double-spin").

### Design-system discipline
Every color, type size, radius, shadow, and motion timing is a CSS custom
property in one token source (`packages/design-system/src/tokens.css`). Lint
rules forbid raw hex and bare Tailwind palette utilities in the app. Voice & tone
(sentence case, second person, no exclamation marks, no emoji in product UI) is
also lint-enforced.

---

## 12. What we have built

Delivery has run as a sequence of verified, committed waves. Every wave passed
the full gate (typecheck · lint · tests · build) before commit.

| Wave / pass | Delivered |
|---|---|
| **MVP foundation** | Working PWA, 14-section marketing landing, full app shell (today/timeline/report/prep/patterns/settings), onboarding, FAB/overlays, COOP/COEP for WASM isolation |
| **Wave 1 — Foundations** | Error/loading/not-found boundaries; data integrity (child-scoped queries, fail-loud append-only triggers, sequence uniqueness, correction ordering); security headers + write-RLS + `handle_new_user`; design-token repair; accessibility (focus rings, focus trap, aria-live); fixed a pre-existing production build break |
| **Wave 2 — Features** | First-run onboarding gate; prep/report honesty (no fabricated clinical advice; typed report stats); PWA update-safety; `/today` 299 → 199 KB; responsive mobile→desktop |
| **Wave 3 — Verification** | Report-section + migration-smoke tests; design-token & voice lint enforcement; strengthened e2e; CI Playwright job + coverage gating |
| **Responsive depth** | Fluid type scale, codified breakpoints, reading-width token, safe-area handling, mobile hamburger nav, big-screen treatment |
| **Co-parent (Phase 2)** | Per-row "logged by" attribution; care-circle management UI; invite scaffold (table + RLS already existed) |
| **Sync + Push (Phase 2)** | Electric read-shape definitions + writes-through outbox + sync-state UI; Web Push SW handlers + subscription + `send_reminders` cron — all gated, deploy-ready |
| **P0 — Compliance blockers** | AI payload pseudonymization (the key HIPAA fix); clinical disclaimer on report + PDF; complete all-tables data export |
| **P0.5 — Emerald retheme** | Primary accent indigo → emerald via the token layer; refreshed screenshots + deck + proposal |
| **P1 — Compliance features** | Account deletion (with audit carve-out); retention purge cron; 7-year audit-log table; Zod on every edge boundary; rate limiting |
| **P2 — Program maturity** | Global Privacy Control opt-out; TOTP 2FA scaffold; `/accessibility` statement page |
| **Deploy readiness** | Fixed migration runner (2 → all 11) and function deploy (2 → all 5); gated the demo seed; built the `/dev` backdoor; rewrote the deploy runbook |
| **Deliverables** | An internal stakeholder deck (PPTX) and proposal (DOCX), plus 14 product screenshots, generated from the live app |

**Repository:** `gigabittech/navigator` (default branch `main`). CI gates every
change. All work is committed with conventional-commit messages.

---

## 13. What is planned

### Phase 2 — activation (built, needs a live environment)
- **Cross-device sync — BASE PATH SHIPPED.** A two-way Supabase data link is
  built and wired (`lib/sync/supabase-sync.ts`): on sign-in the device pulls the
  full care record down under the user's own RLS, then pushes locally-authored
  rows up (boot round trip + 30-second steady-state push). A fresh device picks
  up the whole record; events logged on one device land on the next. The
  **Electric streaming upgrade** (live read-shapes, real conflict resolution)
  remains the Phase 2 enhancement; it needs a running Electric service and a
  PGlite 0.3 → 0.4 upgrade (a separate, browser-verified step).
- **Co-parent sharing** — wire the real invite-send (the UI, attribution, table,
  and RLS are built; cross-device delivery arrives with sync).
- **Dose-reminder push** — activate `send_reminders` (needs VAPID keys + a cron
  schedule). SW handlers, subscription flow, and the function are built.
- **Pattern detection** — pgvector embeddings on voice notes + observations to
  surface "this happened around this dose adjustment."

### Phase 3 — beyond the parent
- **Clinician portal** — read-only, time-limited share links.
- **Payer-grade exports** — formatting matching insurance / IEP paperwork.
- **IEP document parsing** — drop in a PDF; extract goals + dates.
- **Google OAuth** — a second sign-in method alongside passwordless.
- **Multilingual** — i18n for non-English-speaking caregivers.

### Program & operations
- **Sentry** — error tracking for the incident-response plan (highest-value next
  ops item).
- **PostHog** — product analytics (cookieless / privacy-respecting).
- **SOC 2 Type II** — controls designed in; pursue certification.
- **Voice-transcript retention allowance** — a deliberate migration to let the
  daily purge clear one field on the otherwise-immutable log without weakening
  the append-only guarantee (currently fail-safes to "skipped").

### Explicitly **not** planned
Native iOS/Android wrappers (the PWA is the product); a social/community surface;
an onboarding tour (the product should be obvious enough not to need one).

---

## 14. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FTC enforcement (deceptive practice) | Low | Critical | Privacy commitments specific, verifiable, technically enforced; no ad-tracking / data-sale / AI-training |
| HIPAA breach | Low | High | RLS, AES-256, BAA, append-only audit, minimum-necessary AI payloads |
| FDA reclassifies as SaMD | Low | High | No autonomous clinical recommendations; "informational only"; disclaimers on report + PDF |
| Claude API cost at scale | Medium | High | Per-user rate limiting; on-device report generation; AI is opt-in per report |
| iOS push limitations | High | Low | iOS 16.4+ only; graceful fallback; reminders also visible in-app |
| Sync activation regressions | Medium | Medium | Built as a gated scaffold; PGlite upgrade verified in a real browser before activation; fails safe |
| User trust erosion from clinical "advice" | Medium | High | Report is informational; no recommendations; honest derived stats only |
| Deploy drift (scripts vs. schema) | — | — | **Resolved**: migration runner + function deploy now cover the full surface |

---

## 15. Appendix

### Routes (22)

**Marketing (public, SSR):** `/`, `/about`, `/story`, `/privacy`, `/terms`,
`/accessibility`, `/sign-in`, `/waitlist`, `/auth/callback`, `/dev` (hidden),
`/offline`.

**App shell (auth-gated, CSR):** `/today`, `/timeline`, `/report`, `/prep`,
`/patterns`, `/settings`, `/onboarding` (+ `/child`, `/medications`,
`/reminders`, `/done`).

### Database migrations (11)
`0001_init` · `0002_rls_policies` · `0003_waitlist` ·
`0004_append_only_triggers` · `0005_log_events_sequence_unique` ·
`0006_write_access_rls` · `0007_handle_new_user` · `0008_sync_outbox_unique` ·
`0009_push_subscriptions` · `0010_audit_log` · `0011_rate_limits`.

### Environment variables
**Client (NEXT_PUBLIC):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`VAPID_PUBLIC_KEY`, `PLAUSIBLE_DOMAIN`, `ELECTRIC_URL` (deferred).
**Server (Vercel):** `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`WAITLIST_FROM`, `DEV_LOGIN_ENABLED`, `DEV_LOGIN_SECRET`, `DEV_LOGIN_EMAIL`.
**Edge Function secrets (Supabase):** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`ALLOWED_ORIGIN`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`.

### Related documents
- `docs/deploy.md` — full deployment runbook
- `docs/architecture.md` — architecture deep-dive
- `docs/voice.md` — voice & tone guide
- `docs/roadmap.md` — living roadmap
- `deliverables/Navigator-Deck.pptx`, `deliverables/Navigator-Proposal.docx`

---

*Navigator — Powered by NovaSapien Labs. Navigator does not diagnose, prescribe,
or treat. For clinical decisions, always consult your child's provider.*
