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
    <main className="min-h-screen flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md" elevation="floating">
        <h1 className="text-2xl font-bold mb-2">Sign in</h1>

        {configured ? (
          <>
            <p className="text-fg-2 mb-6">
              We&rsquo;ll email you a one-time code. No password to remember.
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
    </main>
  );
}
