import { defineConfig } from "vitest/config";

export default defineConfig({
  // Inline an empty PostCSS config so Vite doesn't walk up and pick up the
  // root postcss.config that references Next.js plugins not available here.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["lib/**/__tests__/**/*.test.ts"],
    environment: "node",
    // PGlite WASM takes a moment to load — increase per-test timeout.
    testTimeout: 30_000,
    // Run tests sequentially to avoid PGlite WASM memory contention.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
