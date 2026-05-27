"use client";

import { useState } from "react";
import { Button, Field } from "@navigator/design-system/components";
import { requestCode, verifyCode, type AuthResult } from "../_actions";

export function SignInForm() {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, setPending] = useState(false);

  async function onRequest(formData: FormData) {
    setPending(true);
    setEmail(String(formData.get("email") ?? ""));
    const res = await requestCode(formData);
    setResult(res);
    if (res.ok && res.stage === "code") setStage("code");
    setPending(false);
  }

  async function onVerify(formData: FormData) {
    setPending(true);
    formData.set("email", email);
    const res = await verifyCode(formData);
    // On success the action redirects; only failures return here.
    setResult(res);
    setPending(false);
  }

  if (stage === "code") {
    return (
      <form action={onVerify} className="flex flex-col gap-4">
        <p className="text-sm text-fg-2">{result?.message ?? `Code sent to ${email}.`}</p>
        <Field
          label="6-digit code"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          required
        />
        {result && !result.ok ? <p className="text-xs text-danger-fg">{result.message}</p> : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Verifying…" : "Verify and continue"}
        </Button>
        <button
          type="button"
          className="text-sm text-fg-3 hover:text-fg-1"
          onClick={() => {
            setStage("email");
            setResult(null);
          }}
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={onRequest} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" placeholder="you@example.com" required />
      {result && !result.ok ? <p className="text-xs text-danger-fg">{result.message}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Email me a code"}
      </Button>
    </form>
  );
}
