# E2E Tests

Navigator's end-to-end tests use Playwright.

## Running locally

```bash
# Install browsers (first time only)
cd apps/web && npx playwright install chromium

# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui
```

## CI

E2E tests run on every PR via the CI workflow. They require the dev server to start,
which happens automatically via the `webServer` config in `playwright.config.ts`.

The tests assume local mode (no Supabase credentials) — PGlite seeds demo data on
first load.

## Adding tests

Tests live in `apps/web/e2e/`. Follow the patterns in existing test files.
All tests should work in local mode (no auth required).
