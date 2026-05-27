/**
 * @navigator/design-system
 *
 * Visual source of truth. Import tokens.css once at the app root, then use
 * either the React primitives (./components) or the Tailwind preset.
 *
 *   // apps/web/app/layout.tsx
 *   import "@navigator/design-system/tokens.css";
 *
 *   // tailwind.config.ts
 *   import navigatorPreset from "@navigator/design-system/tailwind-preset";
 *   export default { presets: [navigatorPreset], ... };
 *
 *   // anywhere
 *   import { Button, Pill, SyncDot } from "@navigator/design-system/components";
 */

export * from "./components/index.js";
export { cn } from "./lib/cn.js";
export { default as tailwindPreset } from "./tailwind-preset.js";
