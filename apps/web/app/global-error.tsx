"use client";

import { Button } from "@navigator/design-system/components";

/**
 * Root error boundary. Catches errors thrown in the root layout itself — the
 * one place a normal `error.tsx` can't reach. Because it replaces the entire
 * document, it must render its own <html> and <body>. Keep this dependency-light
 * and self-contained: anything that already crashed (the layout, providers,
 * design-system styles) may not be available here.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: "var(--surface-page, #FAFAF7)",
          color: "var(--fg-1, #0F172A)",
          fontFamily:
            "var(--font-sans, ui-sans-serif, system-ui, -apple-system, sans-serif)",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: 0,
            color: "var(--fg-1, #0F172A)",
          }}
        >
          Something broke. Your data is still on this device.
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            maxWidth: "28rem",
            margin: 0,
            color: "var(--fg-3, #64748B)",
          }}
        >
          Nothing you logged was lost. Try again, and if it keeps happening,
          close and reopen the app.
        </p>
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </body>
    </html>
  );
}
