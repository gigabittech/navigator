import { defineConfig } from "vitest/config";

export default defineConfig({
  // No CSS in this package — pin an inline PostCSS config so Vite doesn't walk
  // up the filesystem and load an unrelated postcss.config from a parent dir.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
