import Link from "next/link";
import { Button } from "@navigator/design-system/components";

/**
 * Marketing landing — SSR, public, indexable.
 * Real copy + visuals to be filled in. This is a content-light placeholder
 * that proves the design-system wiring works end-to-end.
 */
export default function MarketingHome() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-marketing mx-auto">
        <p className="eyebrow mb-6">Navigator · early access</p>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-fg-1 max-w-3xl text-balance">
          Walk into every appointment prepared.
        </h1>
        <p className="mt-6 text-lg text-fg-2 max-w-2xl">
          A calm, local-first companion for parents managing a child&rsquo;s complex
          psychiatric care. Log doses and observations in seconds. Generate a
          90-day clinical report in one tap.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/waitlist">
            <Button size="lg">Join the waitlist</Button>
          </Link>
          <Link href="/story">
            <Button size="lg" variant="ghost">
              Why we built this
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
