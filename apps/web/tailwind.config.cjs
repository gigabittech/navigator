// CommonJS Tailwind config — used at runtime by PostCSS/Tailwind on all
// platforms including Alpine Linux Docker builds. Takes search-order precedence
// over tailwind.config.ts (.cjs < .mjs < .ts), so jiti is never invoked.
// tailwind.config.ts remains for TypeScript type-checking in the IDE.

const navigatorPreset = require("@navigator/design-system/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [navigatorPreset],
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};
