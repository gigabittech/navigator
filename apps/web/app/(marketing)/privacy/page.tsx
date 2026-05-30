import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Privacy policy — Navigator",
  description: "How Navigator handles your data.",
};

export default function PrivacyPage() {
  return (
    <>
      {/* Dark nav bar consistent with the rest of the marketing site */}
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
        <article
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "64px 24px 96px",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 48 }}>
            <p
              className="eyebrow"
              style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}
            >
              <span className="bar" />
              Legal
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
              Privacy policy
            </h1>
            <p style={{ marginTop: 12, color: "var(--fg-3)", fontSize: "var(--text-sm)" }}>
              Last updated: May 2026
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
              Navigator is built on a simple principle: your child&rsquo;s health data belongs to you,
              stays on your device, and is never sold. This policy explains exactly what we collect,
              why, and how.
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", marginBottom: 48 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

            {/* Section 1 */}
            <section>
              <h2 style={h2Style}>1. What we collect</h2>

              <h3 style={h3Style}>On the marketing site</h3>
              <p style={pStyle}>
                If you submit your email address via the waitlist form, we store that email address
                and the date you submitted it. That is the only personal information collected on the
                marketing site.
              </p>

              <h3 style={h3Style}>In the app</h3>
              <p style={pStyle}>
                All health data you log in Navigator — medications, doses, observations, behavioral
                notes, appointments — is stored <strong>locally on your device</strong> using an
                in-browser database (PGlite, backed by IndexedDB). This data never leaves your
                device unless you explicitly enable cross-device sync (see section 3).
              </p>
              <p style={pStyle}>
                When you create an account, we store your email address and a hashed password (via
                Supabase Auth). We do not store any health data server-side until you enable sync.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 style={h2Style}>2. How we use your data</h2>
              <ul style={ulStyle}>
                <li><strong>Waitlist email:</strong> to notify you when your beta access slot is ready. No marketing, no newsletters, one email per person.</li>
                <li><strong>Account email:</strong> for authentication and to send service-related messages (password reset, etc.).</li>
                <li><strong>App health data:</strong> processed entirely on your device to generate reports and detect patterns. It is not transmitted to our servers in standard local mode.</li>
              </ul>
              <p style={pStyle}>
                We do not sell your data. We do not share your data with advertisers. We do not use
                your child&rsquo;s health data to train any AI model.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 style={h2Style}>3. Data sync (optional)</h2>
              <p style={pStyle}>
                Navigator works fully without an account. If you choose to enable cross-device sync,
                your data is encrypted end-to-end and stored in Supabase Postgres under your user ID.
                Our infrastructure providers (Supabase, Vercel) sign Business Associate Agreements
                covering any protected health information.
              </p>
              <p style={pStyle}>
                Sync is opt-in. You can disable it at any time from settings, and request deletion of
                your server-side data by contacting us (see section 8).
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 style={h2Style}>4. Analytics</h2>
              <p style={pStyle}>
                The Navigator marketing site uses{" "}
                <a href="https://plausible.io" target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  Plausible Analytics
                </a>
                , a cookieless analytics tool. Plausible does not collect personal data, does not
                use cookies, and does not track you across sites. We see aggregate page view counts
                and referrer sources only — nothing that identifies you individually.
              </p>
              <p style={pStyle}>
                No analytics of any kind run inside the app shell. Your usage of the app itself
                is entirely private.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 style={h2Style}>5. Data retention</h2>
              <ul style={ulStyle}>
                <li><strong>Waitlist emails:</strong> kept until Navigator launches broadly or until you request deletion, whichever comes first.</li>
                <li><strong>Account data (if sync enabled):</strong> retained while your account is active. Deleted within 30 days of an account deletion request.</li>
                <li><strong>Local app data:</strong> stored on your device. You can clear it at any time via your browser settings or the in-app reset option.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 style={h2Style}>6. Your rights</h2>
              <p style={pStyle}>
                Depending on where you live, you may have rights to access, correct, export, or
                delete your personal data. To exercise any of these rights, email us at{" "}
                <a href="mailto:[privacy@yourdomain.com]" style={linkStyle}>
                  [privacy@yourdomain.com]
                </a>{" "}
                with the subject line &ldquo;Privacy request&rdquo;. We will respond within 30 days.
              </p>
              <p style={pStyle}>
                Because your health data lives on your device by default, you already have full
                control over it — no request needed.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 style={h2Style}>7. Children&rsquo;s privacy</h2>
              <p style={pStyle}>
                Navigator is designed for parents and guardians aged 18 and over. We do not collect
                personal data directly from children. Health data about your child (doses,
                observations, etc.) is entered by you, the parent, and stored on your device. We do
                not have access to it unless you enable sync, and even then, it is stored under
                your account — not your child&rsquo;s.
              </p>
              <p style={pStyle}>
                If you believe we have inadvertently collected information from a child under 13
                without parental consent, please contact us immediately.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 style={h2Style}>8. Contact</h2>
              <p style={pStyle}>
                Questions about this policy or your data? Email us at{" "}
                <a href="mailto:[privacy@yourdomain.com]" style={linkStyle}>
                  [privacy@yourdomain.com]
                </a>
                . We take privacy questions seriously and will respond within 30 days.
              </p>
            </section>

          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "48px 0 32px" }} />

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/terms" className="btn btn-ghost btn-sm" style={{ borderRadius: "var(--radius-full)" }}>
              Terms of service
            </Link>
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

const h3Style: React.CSSProperties = {
  fontSize: "var(--text-md)",
  fontWeight: "var(--weight-semibold)",
  color: "var(--fg-1)",
  marginTop: 24,
  marginBottom: 8,
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
