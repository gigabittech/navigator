import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-xl font-semibold text-fg-1">You&rsquo;re offline</h1>
      <p className="text-sm text-fg-3 max-w-sm">
        This page hasn&rsquo;t been opened on this device yet, so it isn&rsquo;t saved for
        offline use. Anything you&rsquo;ve already logged is still here.
      </p>
    </main>
  );
}
