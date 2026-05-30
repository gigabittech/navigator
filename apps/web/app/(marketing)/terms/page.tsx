import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Terms of service — Navigator",
  description: "Terms of service for Navigator.",
};

export default function TermsPage() {
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
              Terms of service
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
              Please read these terms before using Navigator. By accessing or using the app, you
              agree to be bound by them.
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", marginBottom: 48 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>

            {/* Section 1 */}
            <section>
              <h2 style={h2Style}>1. Acceptance of terms</h2>
              <p style={pStyle}>
                By accessing or using Navigator (the &ldquo;Service&rdquo;), you agree to these Terms of
                Service and our{" "}
                <Link href="/privacy" style={linkStyle}>Privacy policy</Link>. If you do not agree,
                do not use the Service.
              </p>
              <p style={pStyle}>
                We may update these terms at any time. We will notify you of material changes by
                email or by posting a notice in the app. Continued use after notice constitutes
                acceptance of the updated terms.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 style={h2Style}>2. Description of service</h2>
              <p style={pStyle}>
                Navigator is a local-first progressive web app that helps parents and caregivers
                track medications, log observations, and generate clinical summaries for their
                child&rsquo;s psychiatric care team.
              </p>
              <p style={pStyle}>
                Navigator is <strong>not a medical device</strong> and is <strong>not a substitute
                for professional medical advice, diagnosis, or treatment</strong>. It is a
                record-keeping and communication tool. Always consult a qualified healthcare
                provider for any medical decisions related to your child&rsquo;s care.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 style={h2Style}>3. Accounts and data</h2>
              <p style={pStyle}>
                You may use Navigator without an account in local-only mode. If you create an
                account, you are responsible for maintaining the security of your credentials.
              </p>
              <p style={pStyle}>
                You own your data. The health information you log in Navigator is yours. We do not
                claim any rights to it. Our handling of your data is governed by our{" "}
                <Link href="/privacy" style={linkStyle}>Privacy policy</Link>.
              </p>
              <p style={pStyle}>
                You are responsible for maintaining a backup of any data stored locally on your
                device. We are not liable for data loss resulting from browser storage clearing,
                device failure, or uninstallation.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 style={h2Style}>4. Acceptable use</h2>
              <p style={pStyle}>You agree not to:</p>
              <ul style={ulStyle}>
                <li>Use Navigator for any purpose other than personal, non-commercial tracking of a child in your care.</li>
                <li>Reverse-engineer, decompile, or attempt to extract the source code of Navigator.</li>
                <li>Use the Service to harm, defraud, or harass others.</li>
                <li>Attempt to gain unauthorized access to any part of our systems or other users&rsquo; accounts.</li>
                <li>Use automated tools to scrape or abuse the Service.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 style={h2Style}>5. Health disclaimer</h2>
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.20)",
                  borderRadius: "var(--radius-xl)",
                  padding: "20px 22px",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    ...pStyle,
                    margin: 0,
                    fontWeight: "var(--weight-semibold)",
                    color: "var(--fg-1)",
                  }}
                >
                  Navigator is a tracking tool, not a medical advisor. Nothing in the app
                  constitutes medical advice. Always consult your child&rsquo;s healthcare provider
                  before making any change to their medication, dosage, or treatment plan.
                </p>
              </div>
              <p style={pStyle}>
                Pattern detection and AI-generated summaries are aids to conversation with a
                clinician — they are not diagnoses, recommendations, or treatment plans. The
                accuracy of any report depends entirely on the accuracy of the data you enter.
              </p>
              <p style={pStyle}>
                In an emergency, call 911 or your local emergency services. Navigator is not
                designed for or appropriate in emergency situations.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 style={h2Style}>6. Intellectual property</h2>
              <p style={pStyle}>
                Navigator and its content, features, and functionality are owned by [Company Name]
                and are protected by copyright, trademark, and other intellectual property laws.
                You are granted a limited, non-exclusive, non-transferable license to use the
                Service for its intended purpose.
              </p>
              <p style={pStyle}>
                Your data — the health logs, observations, and notes you enter — remains entirely
                yours. We claim no IP rights over user-generated content.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 style={h2Style}>7. Limitation of liability</h2>
              <p style={pStyle}>
                To the maximum extent permitted by law, Navigator and its developers are not liable
                for any indirect, incidental, special, consequential, or punitive damages, including
                but not limited to loss of data, loss of revenue, or harm arising from reliance on
                app-generated information.
              </p>
              <p style={pStyle}>
                Our total liability for any claim arising from these terms or your use of the
                Service is limited to the amount you paid us in the twelve months preceding the claim
                (which, during free beta, is zero).
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 style={h2Style}>8. Changes to these terms</h2>
              <p style={pStyle}>
                We may update these terms from time to time. We will notify registered users by
                email at least 14 days before material changes take effect. For non-material changes
                (typo fixes, clarifications), we will update the &ldquo;Last updated&rdquo; date above.
              </p>
              <p style={pStyle}>
                If you disagree with updated terms, you may stop using the Service and request
                deletion of your account by contacting us (see section 9).
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 style={h2Style}>9. Contact</h2>
              <p style={pStyle}>
                Questions about these terms? Email us at{" "}
                <a href="mailto:hello@getnavigator.app" style={linkStyle}>
                  hello@getnavigator.app
                </a>
                . For privacy-specific questions, see our{" "}
                <Link href="/privacy" style={linkStyle}>Privacy policy</Link>.
              </p>
            </section>

          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "48px 0 32px" }} />

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/privacy" className="btn btn-ghost btn-sm" style={{ borderRadius: "var(--radius-full)" }}>
              Privacy policy
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
