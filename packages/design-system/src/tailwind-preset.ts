/**
 * Tailwind preset that maps utility classes onto the design-system CSS
 * custom properties defined in tokens.css. Import this into the consuming
 * app's tailwind.config.ts via `presets: [navigatorPreset]`.
 *
 * The mapping is intentionally semantic: utilities reference *roles*
 * (surface-card, fg-1, accent-600) not raw palette steps. The actual
 * palette swap on theme change happens in tokens.css.
 */

import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  content: [],
  theme: {
    // Canonical breakpoint scale. Codifies stock Tailwind steps and adds an
    // `xs` (~400px small phones) and a `3xl` big-screen step so app
    // components have an explicit large-viewport target. Set at the top level
    // (not under `extend`) so the breakpoint contract is fully owned here.
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
    },
    extend: {
      colors: {
        // Surfaces
        "surface-page": "var(--surface-page)",
        "surface-card": "var(--surface-card)",
        "surface-card-alt": "var(--surface-card-alt)",
        "surface-card-raised": "var(--surface-card-raised)",
        "surface-input": "var(--surface-input)",
        "surface-sunk": "var(--surface-sunk)",
        "surface-overlay": "var(--surface-overlay)",
        "surface-tint-accent": "var(--surface-tint-accent)",

        // Deep ink (dark chrome ink steps)
        "ink-700": "var(--ink-700)",
        "ink-800": "var(--ink-800)",
        "ink-900": "var(--ink-900)",

        // Dark chrome surfaces (always-dark sidebar / panels)
        "surface-sidebar": "var(--surface-sidebar)",
        "surface-sidebar-raised": "var(--surface-sidebar-raised)",
        "surface-on-dark-active": "var(--surface-on-dark-active)",
        "surface-on-dark-hover": "var(--surface-on-dark-hover)",

        // Foreground
        "fg-1": "var(--fg-1)",
        "fg-2": "var(--fg-2)",
        "fg-3": "var(--fg-3)",
        "fg-4": "var(--fg-4)",
        "fg-accent": "var(--fg-accent)",
        "fg-on-accent": "var(--fg-on-accent)",

        // Foreground on dark chrome
        "fg-on-dark": "var(--fg-on-dark)",
        "fg-on-dark-muted": "var(--fg-on-dark-muted)",
        "fg-on-dark-faint": "var(--fg-on-dark-faint)",
        "fg-on-dark-ghost": "var(--fg-on-dark-ghost)",

        // Borders (use via ring-/border-)
        "border-subtle": "var(--border-subtle)",
        "border-card": "var(--border-card)",
        "border-strong": "var(--border-strong)",
        "border-accent": "var(--border-accent)",
        "border-on-dark": "var(--border-on-dark)",
        "border-on-dark-subtle": "var(--border-on-dark-subtle)",

        // Brand accent
        "accent-50": "var(--color-accent-50)",
        "accent-100": "var(--color-accent-100)",
        "accent-200": "var(--color-accent-200)",
        "accent-300": "var(--color-accent-300)",
        "accent-400": "var(--color-accent-400)",
        "accent-500": "var(--color-accent-500)",
        "accent-600": "var(--color-accent-600)",
        "accent-700": "var(--color-accent-700)",
        "accent-fg": "var(--color-accent-fg)",
        "accent-bg": "var(--color-accent-bg)",

        // Gold brand accent
        "accent-gold-500": "var(--accent-gold-500)",
        "accent-gold-600": "var(--accent-gold-600)",
        "accent-gold-700": "var(--accent-gold-700)",
        "accent-gold-on-dark": "var(--accent-gold-on-dark)",
        "accent-gold-bg": "var(--accent-gold-bg)",
        "accent-gold-bd": "var(--accent-gold-bd)",

        // Semantic
        "success-fg": "var(--color-success-fg)",
        "success-dot": "var(--color-success-dot)",
        "success-bg": "var(--color-success-bg)",
        "success-bd": "var(--color-success-bd)",
        "warning-fg": "var(--color-warning-fg)",
        "warning-dot": "var(--color-warning-dot)",
        "warning-bg": "var(--color-warning-bg)",
        "warning-bd": "var(--color-warning-bd)",
        "danger-fg": "var(--color-danger-fg)",
        "danger-dot": "var(--color-danger-dot)",
        "danger-bg": "var(--color-danger-bg)",
        "danger-bd": "var(--color-danger-bd)",
        "info-fg": "var(--color-info-fg)",
        "info-dot": "var(--color-info-dot)",
        "info-bg": "var(--color-info-bg)",
        "info-bd": "var(--color-info-bd)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "2xs": ["var(--text-2xs)", { lineHeight: "var(--lh-normal)" }],
        xs: ["var(--text-xs)", { lineHeight: "var(--lh-normal)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--lh-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--lh-normal)" }],
        md: ["var(--text-md)", { lineHeight: "var(--lh-normal)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--lh-snug)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--lh-snug)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--lh-snug)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--lh-tight)" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "var(--lh-tight)" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "var(--lh-tight)" }],
        "6xl": ["var(--text-6xl)", { lineHeight: "var(--lh-tight)" }],
      },
      fontWeight: {
        regular: "var(--weight-regular)",
        medium: "var(--weight-medium)",
        semibold: "var(--weight-semibold)",
        bold: "var(--weight-bold)",
        black: "var(--weight-black)",
      },
      letterSpacing: {
        tight: "var(--tracking-tight)",
        snug: "var(--tracking-snug)",
        normal: "var(--tracking-normal)",
        wide: "var(--tracking-wide)",
        eyebrow: "var(--tracking-eyebrow)",
      },
      lineHeight: {
        tight: "var(--lh-tight)",
        snug: "var(--lh-snug)",
        normal: "var(--lh-normal)",
        relaxed: "var(--lh-relaxed)",
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "glow-accent": "var(--shadow-glow-accent)",
        "glow-success": "var(--shadow-glow-success)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        out: "var(--ease-out)",
        in: "var(--ease-in)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
        confirm: "var(--duration-confirm)",
      },
      maxWidth: {
        app: "var(--layout-app-max)",
        marketing: "var(--layout-marketing-max)",
        "web-content": "var(--layout-web-content-max)",
        reading: "var(--reading-max)",
      },
      minHeight: {
        tap: "var(--tap-target-min)",
      },
      minWidth: {
        tap: "var(--tap-target-min)",
      },
    },
  },
};

export default preset;
