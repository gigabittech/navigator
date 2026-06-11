import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPreviewGateEnabled } from "@/lib/auth/preview";
import { unlock } from "./_actions";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Private preview — Navigator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The private-preview curtain. One shared password stands between the public
 * internet and the unannounced product; behind it, the full site works —
 * sign up, sign in, every feature, sign out. When PREVIEW_PASSWORD is unset
 * (launch), this page no longer exists.
 */
export default function PreviewAccessPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  if (!isPreviewGateEnabled()) notFound();

  const from = searchParams.from ?? "";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--surface-page, #0B1526)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            margin: "0 auto 16px",
            borderRadius: 12,
            background: "var(--color-accent-500, #10B981)",
            color: "var(--fg-on-accent, #FFFFFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          N
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg-1, #0F172A)", marginBottom: 8 }}>
          Navigator is in private preview
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-3, #64748B)", marginBottom: 24, lineHeight: 1.5 }}>
          This early version isn&rsquo;t public yet. Enter the preview password to
          see the site and try the app.
        </p>

        <form action={unlock} style={{ display: "grid", gap: 10 }}>
          <input type="hidden" name="from" value={from} />
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Preview password"
            aria-label="Preview password"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-default, #CBD5E1)",
              background: "var(--surface-card, #fff)",
              color: "var(--fg-1, #0F172A)",
              fontSize: 15,
            }}
          />
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Enter
          </button>
        </form>

        {searchParams.error ? (
          <p role="alert" style={{ marginTop: 14, fontSize: 13, color: "var(--danger-fg, #B91C1C)" }}>
            That password didn&rsquo;t match. Check it and try again.
          </p>
        ) : null}

        <p style={{ marginTop: 28, fontSize: 12, color: "var(--fg-3, #64748B)" }}>
          Powered by NovaSapien Labs
        </p>
      </div>
    </main>
  );
}
