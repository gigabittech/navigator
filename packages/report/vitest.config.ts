import { defineConfig } from "vitest/config";

export default defineConfig({
  // This package has no CSS. Pin an inline PostCSS config so Vite does not
  // walk up the filesystem and pick up an unrelated postcss.config from a
  // parent directory.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
