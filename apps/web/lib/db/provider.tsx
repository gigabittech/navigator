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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span
          className="size-2 rounded-full bg-accent-500 animate-pulse-slow"
          aria-hidden
        />
        <p className="text-sm text-fg-3" role="status">
          Opening your log…
        </p>
      </div>
    );
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
