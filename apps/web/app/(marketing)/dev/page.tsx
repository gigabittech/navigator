import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Card, Field } from "@navigator/design-system/components";
import { devLogin } from "./_actions";

export const metadata: Metadata = {
  title: "Dev access",
  robots: { index: false, follow: false },
};

/**
 * Hidden dev entry point. 404s entirely unless DEV_LOGIN_ENABLED is set, so it
 * doesn't exist in real production. With the flag on, a single form posts the
 * dev secret to the devLogin Server Action, which mints a real session and
 * lands on /today. Never linked from any UI.
 */
export default function DevPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Server-only gate: the route doesn't exist unless dev login is enabled.
  if (process.env.DEV_LOGIN_ENABLED !== "true") notFound();

  const error = searchParams.error;
  const message =
    error === "config"
      ? "Dev login isn't fully configured on the server."
      : error
        ? "That didn't work. Check the dev secret and try again."
        : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-md" elevation="floating">
        <h1 className="text-2xl font-bold mb-2">Dev access</h1>
        <p className="text-fg-2 mb-6">
          Single-click sign-in for development. Enter the dev secret to open the
          app as the development user.
        </p>
        <form action={devLogin} className="flex flex-col gap-4">
          <Field
            label="Dev secret"
            name="secret"
            type="password"
            autoComplete="off"
            placeholder="••••••••"
          />
          <Button type="submit" size="lg" fullWidth>
            Open the app
          </Button>
          {message ? <p className="text-sm text-danger-fg">{message}</p> : null}
        </form>
      </Card>
    </main>
  );
}
