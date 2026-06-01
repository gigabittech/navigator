import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Branded 404. Rendered outside the app chrome (and on the public marketing
 * surface), so it stands on its own. Offers a way back into the app and to the
 * marketing home, since either surface can land here.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page px-6 text-center">
      <p className="font-mono text-sm font-semibold tracking-wide text-fg-accent">
        404
      </p>
      <h1 className="text-xl font-semibold text-fg-1">
        This page isn&rsquo;t here
      </h1>
      <p className="max-w-sm text-sm text-fg-3">
        The link may be old, or the page moved. Your data is safe — head back to
        where you were.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/today"
          className="inline-flex min-h-tap items-center justify-center rounded-lg bg-accent-600 px-5 text-base font-semibold text-fg-on-accent transition-colors duration-fast hover:bg-accent-700 focus-visible:outline-none focus-visible:shadow-glow-accent"
        >
          Go to today
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-tap items-center justify-center rounded-lg border border-border-card bg-surface-card px-5 text-base font-semibold text-fg-1 transition-colors duration-fast hover:bg-surface-card-alt focus-visible:outline-none focus-visible:shadow-glow-accent"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
