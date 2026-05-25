<!--
Pull request template. Fill out every section — empty sections will be
challenged in review.
-->

## What changed

<!-- A sentence or two. What problem does this solve? -->

## Why

<!-- Link to the issue, the design doc, or the Slack thread that triggered this. -->

## Screenshots / video

<!-- Required for any UI change. Light + dark theme if visible. -->

## Checklist

- [ ] **Voice.** All user-facing strings are sentence case, second person, no exclamation marks, no emoji.
- [ ] **Tokens.** No raw hex colors, no magic numbers — all visuals go through `@navigator/design-system`.
- [ ] **A11y.** Focus rings visible, 44px tap targets, status not color-only.
- [ ] **Local-first.** Reads/writes go through the SQLite client; no `await fetch()` on the critical path.
- [ ] **RLS.** Any new table has `ENABLE ROW LEVEL SECURITY` + explicit policies in the same migration.
- [ ] **Tests.** Touched `packages/report`? Updated/added a test.
- [ ] **Schema.** Any `log_events` change updates `event-types.ts` + projections + the SQL `CHECK` constraint.
- [ ] **Perf.** No new heavy deps; bundle size considered.

## Notes for the reviewer

<!-- Anything tricky, anything you punted on, anything you want a second pair of eyes on. -->
