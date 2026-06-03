import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Accessibility — Navigator",
  description:
    "Navigator's accessibility commitment: WCAG 2.1 AA, plain language, and how to request accommodations.",
};

export default function AccessibilityPage() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand" style={{ textDecoration: "none" }}>
            <span className="brand-mark">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 19V5l14 14V5" />
              </svg>
            </span>
            Navigator
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/waitlist">Join the waitlist</Link>
          </nav>
          <Link href="/waitlist" className="btn btn-primary">
            Join the waitlist
          </Link>
        </div>
      </header>

      <main style={{ background: "var(--surface-page, #FAFAF7)", minHeight: "100vh" }}>
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
          <div style={{ marginBottom: 48 }}>
            <p className="eyebrow" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="bar" />
              Accessibility
            </p>
            <h1
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: "var(--weight-bold)",
                letterSpacing: "var(--tracking-tight)",
                lineHeight: "var(--lh-snug)",
                color: "var(--fg-1)",
                margin: 0,
              }}
            >
              Accessibility statement
            </h1>
            <p style={{ marginTop: 12, color: "var(--fg-3)", fontSize: "var(--text-sm)" }}>
              Last updated: June 2026
            </p>
            <p
              style={{
                marginTop: 16,
                fontSize: "var(--text-md)",
                color: "var(--fg-2)",
                lineHeight: "var(--lh-relaxed)",
                maxWidth: "60ch",
              }}
            >
              Navigator is for parents under real stress, often using it one-handed. Accessibility
              is not an add-on for us — it is the difference between a tool that helps and one that
              gets in the way.
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", marginBottom: 48 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            <section>
              <h2 style={h2Style}>Our standard</h2>
              <p style={pStyle}>
                Navigator targets conformance with the Web Content Accessibility Guidelines (WCAG)
                2.1 at Level AA, and treats ADA Title III as applicable. Accessibility is built in
                from the start, not retrofitted.
              </p>
            </section>

            <section>
              <h2 style={h2Style}>What this means in the app</h2>
              <ul style={ulStyle}>
                <li>Text meets a minimum 4.5:1 contrast against its background.</li>
                <li>Every interactive control is reachable and operable by keyboard, with a visible focus ring.</li>
                <li>Status is never communicated by color alone — colors are always paired with an icon or a label.</li>
                <li>Touch targets are at least 44 by 44 pixels.</li>
                <li>You can pinch-zoom on every screen; we never disable it.</li>
                <li>Animations respect your “reduce motion” setting.</li>
                <li>Log confirmations, sync status, and report generation are announced to screen readers.</li>
              </ul>
            </section>

            <section>
              <h2 style={h2Style}>Plain language</h2>
              <p style={pStyle}>
                We write the interface and notifications at a Grade 8 reading level or below. The
                clinical report is calibrated for parent readability — clear enough for you, precise
                enough to be useful to a provider.
              </p>
            </section>

            <section>
              <h2 style={h2Style}>Requesting an accommodation</h2>
              <p style={pStyle}>
                If something gets in your way, tell us. We accept and respond to accessibility
                requests, and we treat them as bugs to fix, not favors. Email{" "}
                <a href="mailto:accessibility@navigator.app" style={linkStyle}>
                  accessibility@navigator.app
                </a>{" "}
                and we will work with you.
              </p>
            </section>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 56, flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-ghost btn-sm" style={{ borderRadius: "var(--radius-full)" }}>
              Back to home
            </Link>
          </div>
        </article>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom" style={{ paddingTop: 0 }}>
            <div className="legal">
              © 2026 Navigator · made by NovaSapien Labs. Navigator does not diagnose, prescribe, or treat.
              For clinical decisions, always consult your child&rsquo;s provider.
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: "var(--text-xs)", color: "var(--fg-on-dark-3)" }}>
              <Link href="/privacy" style={{ color: "inherit" }}>Privacy</Link>
              <Link href="/terms" style={{ color: "inherit" }}>Terms</Link>
              <Link href="/accessibility" style={{ color: "inherit" }}>Accessibility</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ── Style constants ── */
const h2Style: React.CSSProperties = {
  fontSize: "var(--text-xl)",
  fontWeight: "var(--weight-bold)",
  color: "var(--fg-1)",
  marginBottom: 16,
  marginTop: 0,
};

const pStyle: React.CSSProperties = {
  fontSize: "var(--text-base)",
  lineHeight: "var(--lh-relaxed)",
  color: "var(--fg-2)",
  margin: "0 0 12px",
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: "0 0 12px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontSize: "var(--text-base)",
  lineHeight: "var(--lh-relaxed)",
  color: "var(--fg-2)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};
