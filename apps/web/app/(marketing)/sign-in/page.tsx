import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card } from "@navigator/design-system/components";
import { isSupabaseConfigured } from "@/lib/config";
import { SignInForm } from "./_components/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Navigator with a one-time email code.",
};

export default function SignInPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Brand, so the page reads as Navigator rather than a bare form. */}
        <div className="flex flex-col items-center mb-6 text-center">
          <span
            aria-hidden
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-accent-500 text-fg-on-accent font-bold text-xl mb-3"
          >
            N
          </span>
          <h1 className="text-2xl font-bold">
            {configured ? "Sign in or create your account" : "Open Navigator"}
          </h1>
        </div>

        <Card className="w-full" elevation="floating">
          {configured ? (
            <>
              <p className="text-fg-2 mb-6 text-sm">
                Enter your email and we&rsquo;ll send a 6-digit code — it signs you
                in, or creates your account if you&rsquo;re new. No password to
                remember.
              </p>
              <SignInForm />
            </>
          ) : (
            <>
              <p className="text-fg-2 mb-6">
                Navigator is running in local mode on this device — no account needed.
                Everything you log stays here. Sign-in turns on once a backend is connected.
              </p>
              <Link href="/today">
                <Button size="lg" fullWidth>
                  Open the app
                </Button>
              </Link>
            </>
          )}
        </Card>

        <div className="flex items-center justify-between mt-5 text-sm">
          <Link href="/" className="text-fg-3 hover:text-fg-1 transition-colors">
            &larr; Back to home
          </Link>
          <span className="text-fg-3">Powered by NovaSapien Labs</span>
        </div>
      </div>
    </main>
  );
}
