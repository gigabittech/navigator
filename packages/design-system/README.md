# @navigator/design-system

Visual source of truth for Navigator. Tokens, Tailwind preset, and React
primitives — all driven by `src/tokens.css`.

## Usage

```ts
// apps/web/app/layout.tsx
import "@navigator/design-system/tokens.css";
```

```ts
// apps/web/tailwind.config.ts
import navigatorPreset from "@navigator/design-system/tailwind-preset";

export default {
  presets: [navigatorPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
};
```

```tsx
import { Button, Pill, SyncDot } from "@navigator/design-system/components";
```

## What lives here

```
src/
├── tokens.css              ← all CSS custom properties
├── tailwind-preset.ts      ← maps tokens → Tailwind utilities
├── fonts/                  ← Inter + JetBrains Mono (woff2, local)
├── assets/                 ← logo, glyph, app icon
├── components/             ← Button, Card, Field, Pill, SyncDot, TagChip
└── lib/cn.ts               ← clsx + tailwind-merge helper
```

## Rules

- Never reference a raw hex in `apps/web`. If a token is missing, add it
  to `tokens.css` and bump this package.
- Tailwind utilities are semantic (`bg-surface-card`, `text-fg-2`,
  `text-accent-fg`) — never reach for `bg-indigo-600`.
- Light theme is default; dark via `<html data-theme="dark">`.
- WCAG AA pairs are verified in `tokens.css`. Don't introduce new
  fg/bg combinations without re-verifying.
