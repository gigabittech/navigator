"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DbProvider } from "@/lib/db/provider";
import { useChildState } from "@/lib/db/queries/useChild";
import { AppChrome } from "./_components/AppChrome";

/**
 * App-shell layout. The auth gate lives in middleware.ts — reaching here means
 * you're authenticated (or in local single-device mode). DbProvider boots the
 * on-device database.
 *
 * Two framing modes share this segment:
 *  - Onboarding routes (`/onboarding/*`) render full-screen with their own
 *    nested layout — no AppChrome, and exempt from the first-run gate (so the
 *    gate can't redirect onboarding back onto itself).
 *  - Every other app route renders inside AppChrome (sidebar + tab bar) behind
 *    the FirstRunGuard, which routes never-onboarded devices into the flow.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (isOnboarding) {
    // The onboarding segment supplies its own DbProvider + full-screen frame
    // via app/(app)/onboarding/layout.tsx. Render it bare — no chrome, no gate.
    return children;
  }

  return (
    <DbProvider>
      <FirstRunGuard>
        <AppChrome>{children}</AppChrome>
      </FirstRunGuard>
    </DbProvider>
  );
}

/** Calm interstitial reused while the first-run decision settles. */
function GuardSkeleton() {
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

/**
 * First-run gate. A device that has never completed (or skipped) onboarding is
 * routed to /onboarding before any app screen renders, so a new user never
 * lands on an empty shell.
 *
 * Signal: the `navigator.onboarded` localStorage flag — the exact key
 * onboarding/done writes when the flow finishes and onboarding/page sets when
 * the user chooses to skip. The on-device DB always carries a seeded child
 * (see lib/db/seed.ts), so a "no child row" check alone can never detect a
 * first run — the flag is the source of truth, and any device that hasn't set
 * it (fresh or otherwise) is routed into the flow. `useChild()` is read to
 * hold the skeleton until real data is present, so the shell never flashes an
 * empty sidebar.
 *
 * This guard mounts as a child of DbProvider, which renders its own
 * interstitial until the local DB is ready — so by the time we're here the DB
 * has booted and `useChild()` resolves on its first tick. We only hold our own
 * skeleton while the (synchronous) localStorage flag is being read on mount,
 * so the empty app never flashes before a redirect.
 */
function FirstRunGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { child, loaded } = useChildState();

  // Read the onboarded flag once on mount (localStorage isn't reactive, and it
  // only flips inside the onboarding flow, which lives on a different route).
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnboarded(window.localStorage.getItem("navigator.onboarded") === "true");
  }, []);

  const flagRead = onboarded !== null;
  // A device the user has never completed *or* skipped onboarding on. The flag
  // is authoritative and takes strict precedence: an onboarded device is never
  // redirected, even during the tick before `useChild()` resolves.
  const needsOnboarding = flagRead && onboarded === false;

  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, router]);

  // Hold the skeleton until the flag is read and, for a fresh device, while the
  // redirect is in flight — so a never-onboarded user never sees the empty app.
  // For an onboarded device we wait until the child query has RESOLVED (`loaded`)
  // so the shell mounts with real data rather than flashing an empty sidebar.
  // We must wait on `loaded`, NOT on `child` being present: a signed-in user who
  // skipped setup legitimately has no child, and the app's empty states handle
  // that — gating on `child === undefined` would hang the skeleton forever.
  if (!flagRead || needsOnboarding || !loaded) {
    return <GuardSkeleton />;
  }

  return <>{children}</>;
}
