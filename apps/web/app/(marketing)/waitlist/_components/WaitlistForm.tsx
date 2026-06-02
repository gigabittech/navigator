"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button, Field } from "@navigator/design-system/components";
import { joinWaitlist, type WaitlistResult } from "../_actions";

interface WaitlistFormProps {
  /** Renders a compact horizontal form for use in CTA sections */
  inline?: boolean;
}

export function WaitlistForm({ inline }: WaitlistFormProps) {
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await joinWaitlist(new FormData(event.currentTarget));
      setResult(res);
    } finally {
      setPending(false);
    }
  }

  if (result?.ok) {
    return (
      <p className={inline ? "cta-success" : "text-base text-fg-2"} role="status">
        {result.message}
      </p>
    );
  }

  if (inline) {
    return (
      <form onSubmit={submit} className="cta-form">
        <input
          type="email"
          name="email"
          className="cta-input"
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
        <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
          {pending ? "Adding you…" : "Get early access"}
        </button>
        {result && !result.ok ? (
          <p className="cta-error">{result.message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
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
