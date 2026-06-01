# Roadmap

Living doc. Tighter than `docs/architecture.md` — focused on what's next,
not why things are the way they are.

## Phase 1 — MVP (shipped ✅)

- [x] **Auth.** Supabase passwordless magic link + 6-digit OTP via `@supabase/ssr`.
      Graceful local mode when Supabase is unconfigured.
- [x] **Local PGlite wiring.** `lib/db/client.ts` boots PGlite (WASM Postgres) with
      IndexedDB persistence (`idb://navigator`), runs client migrations, seeds demo data.
      Replaces sunset `wa-sqlite` + `electric-sql@0.12` generation.
- [x] **Reactive reads.** `useLiveQuery` from `@electric-sql/pglite-react` throughout
      all (app) routes — dose log tap → UI update < 50ms.
- [x] **Electric sync interface.** Deferred — shape definitions ready in `lib/sync/`.
      Wired in Phase 2; does not affect MVP critical path.
- [x] **/today.** Live dose schedule via `projectDoseStatus`, one-tap outcome chips
      (taken/late/missed/refused), optimistic INSERT into `log_events`.
- [x] **/timeline.** Reverse-chrono `useLiveQuery` of log_events, sticky date headers,
      corrected badges.
- [x] **/report.** Calls `@navigator/report` against local DB, renders structured
      Report. PDF export via `@react-pdf/renderer` (dynamic import).
- [x] **/prep.** Next appointment summary, 14-day adherence, top tags.
- [x] **/settings.** Medication CRUD, light/dark toggle, JSON data export, reset.
- [x] **Voice notes.** MediaRecorder → Whisper Edge Fn (credential-gated, graceful
      without `OPENAI_API_KEY`). Emits `VoiceEntryTranscribed` events.
- [x] **AI narrative.** Claude Edge Fn (`claude-sonnet-4-5`) — feeds structured Report,
      returns clinician summary (credential-gated, graceful without `ANTHROPIC_API_KEY`).
- [x] **PWA install.** Manifest, icons (192/512/maskable), service worker with
      app-shell cache + offline fallback page.
- [x] **Waitlist + sign-in.** Server actions wired to Supabase Auth + Resend SMTP.
- [x] **Tests.** 8 tests in `@navigator/schema` (projections + payloads), 2 in
      `@navigator/report`. Full CI gate: typecheck + lint + test + build.
- [x] **Docs updated.** `CLAUDE.md` + `docs/architecture.md` reflect PGlite stack.

## Phase 2 — Sync + co-parent (~4–8 weeks from now)

- [ ] **Cross-device sync.** Wire Electric read-shapes → PGlite + writes-through-
      Supabase. The `lib/sync/shapes.ts` interface is already defined; connect it.
- [ ] **Co-parent sharing.** Invite flow, collaborator UX, indicator on timeline rows
      for which parent logged.
- [ ] **Pattern detection.** pgvector embeddings on voice notes + observations;
      surface "this happened around this dose adjustment".
- [ ] **Push notifications.** Dose reminder at scheduled time (via Supabase Edge Fn +
      Web Push).

## Phase 3 — Beyond the parent (~8+ weeks from now)

- [ ] **Clinician portal.** Read-only auth scope; share-link with TTL.
- [ ] **Payer-grade exports.** PDF formatting that matches insurance/IEP paperwork.
- [ ] **IEP document parsing.** Drop in a PDF, extract goals + dates.
- [ ] **Google OAuth.** Second sign-in method alongside magic link + OTP.

## Things explicitly NOT in the roadmap

- Native iOS/Android wrappers. The PWA is the product.
- A "social" surface. Parents aren't here for community; they're here
  to get through the next appointment.
- An onboarding tour. The product should be obvious enough not to need
  one. If it isn't, the tour won't save us.
