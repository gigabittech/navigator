"use client";

import { Button, Card } from "@navigator/design-system/components";

/**
 * App-shell error boundary. Renders inside the AppChrome frame (sidebar, tab
 * bar stay put), so this only needs to fill the main content area. Catches
 * render-time errors from any (app) route — a failed projection, a bad query —
 * and offers a calm retry without dropping the user out of the shell.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center"
      data-testid="app-error"
    >
      <Card className="flex max-w-md flex-col items-center gap-3 text-center">
        <h1 className="text-lg font-semibold text-fg-1">
          Something broke on this screen
        </h1>
        <p className="text-sm text-fg-3">
          Your data is still on this device — nothing you logged was lost. Try
          loading this screen again.
        </p>
        <Button type="button" onClick={() => reset()} className="mt-1">
          Try again
        </Button>
      </Card>
    </div>
  );
}
