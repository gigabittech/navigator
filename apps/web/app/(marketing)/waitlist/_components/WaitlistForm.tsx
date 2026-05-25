"use client";

import { useState } from "react";
import { Button, Field } from "@navigator/design-system/components";
import { joinWaitlist, type WaitlistResult } from "../_actions";

export function WaitlistForm() {
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    const res = await joinWaitlist(formData);
    setResult(res);
    setPending(false);
  }

  if (result?.ok) {
    return (
      <p className="text-base text-fg-2" role="status">
        {result.message}
      </p>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
      <Field
        label="What you're managing"
        name="context"
        placeholder="e.g. ADHD + mood, two co-parents"
        hint="Optional — helps us prioritize."
      />
      {result && !result.ok ? (
        <p className="text-xs text-danger-fg">{result.message}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Adding you…" : "Add me to the waitlist"}
      </Button>
    </form>
  );
}
