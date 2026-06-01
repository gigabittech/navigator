import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@navigator/design-system/components";

export const metadata: Metadata = {
  title: "Why we built this",
  description:
    "Navigator exists because managing a child's complex psychiatric care shouldn't mean reconstructing three months from memory in a ten-minute appointment.",
};

export default function StoryPage() {
  return (
    <main className="min-h-screen px-6 py-20">
      <article className="max-w-2xl mx-auto flex flex-col gap-6">
        <p className="eyebrow">Why we built this</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-fg-1 text-balance">
          The appointment is ten minutes. The three months before it are everything.
        </h1>

        <p className="text-lg text-fg-2">
          If you are managing a child&rsquo;s ADHD, mood, or an IEP, you already know the
          pattern. You try a dose change. You watch for weeks. Then you sit across from a
          clinician and try to reconstruct it all from memory, while a younger sibling pulls
          at your sleeve.
        </p>

        <p className="text-base text-fg-2">
          Navigator is built for that reality. You log a dose in one tap. You catch a
          rough afternoon in a sentence, or a voice note while you drive. It all stays on
          your phone, instantly, even with no signal. When the appointment comes, you tap
          once and walk in with ninety days laid out clearly.
        </p>

        <h2 className="text-xl font-semibold text-fg-1 mt-4">What it is not</h2>
        <p className="text-base text-fg-2">
          It is not a social network, a tracker that judges you, or another login that
          loses your data. Your child&rsquo;s information lives on your device first. You own
          it. You decide what to share, and with whom.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/waitlist">
            <Button size="lg">Join the waitlist</Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="ghost">
              Back home
            </Button>
          </Link>
        </div>
      </article>
    </main>
  );
}
