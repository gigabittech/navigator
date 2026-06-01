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
      // The report is the product's promise — its projection-fed section
      // generators must stay covered. Measure only the source that carries
      // logic; the barrel (index.ts) and pure-type module (types.ts) have no
      // executable statements and would otherwise drag the ratio down.
      include: ["src/generate.ts", "src/sections.ts"],
      // Thresholds sit just under the current measured coverage (both files
      // are at 100% today) so any regression fails CI without failing now.
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
