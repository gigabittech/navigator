"use client";

import { type ReactNode, useEffect, useState } from "react";
import { PGliteProvider } from "@electric-sql/pglite-react";
import type { PGliteWithLive } from "@electric-sql/pglite/live";
import { getDb } from "./client.js";

type BootState =
  | { status: "loading" }
  | { status: "ready"; db: PGliteWithLive }
  | { status: "error"; message: string };

/**
 * Boots the on-device PGlite database and makes it available to the app via
 * PGliteProvider. Renders a calm interstitial while the WASM Postgres spins
 * up (first run only — subsequent loads hit the persisted IndexedDB).
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<BootState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    getDb()
      .then((db) => active && setBoot({ status: "ready", db }))
      .catch((err) =>
        active &&
        setBoot({
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
    return () => {
      active = false;
    };
  }, []);

  if (boot.status === "loading") {
    // The route-level loading.tsx already shows a branded skeleton inside the
    // app chrome during navigation. AppChrome can't mount yet — it reads the DB
    // via useLiveQuery — so we render the *same* calm skeleton shape here rather
    // than a second, distinct spinner. The result is one continuous loading
    // state from navigation through DB-ready, with no flash and no layout shift.
    return <DbBootSkeleton />;
  }

  if (boot.status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-base font-semibold text-fg-1">
          Couldn&rsquo;t open your log on this device.
        </p>
        <p className="text-sm text-fg-3 max-w-sm">
          Your data is safe. Reload to try again. {boot.message}
        </p>
      </div>
    );
  }

  return <PGliteProvider db={boot.db}>{children}</PGliteProvider>;
}

/**
 * Calm boot skeleton shown while PGlite spins up. Mirrors the route-level
 * app/(app)/loading.tsx so the transition from navigation → DB-ready is a
 * single continuous state. Decorative only — aria-hidden, with a polite
 * status line for assistive tech so the wait is announced once.
 */
function DbBootSkeleton() {
  return (
    <div className="min-h-screen bg-surface-page">
      <main
        className="mx-auto w-full max-w-app px-5 py-6 md:max-w-none lg:px-7"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}
      >
        <p className="sr-only" role="status">
          Opening your log on this device
        </p>
        <div className="flex animate-pulse flex-col gap-4" aria-hidden>
          <div className="h-7 w-40 rounded-md bg-surface-card-alt" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border-card bg-surface-card p-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-surface-card-alt" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-1/3 rounded bg-surface-card-alt" />
                  <div className="h-3 w-1/2 rounded bg-surface-card-alt" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
