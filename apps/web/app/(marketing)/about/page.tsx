import type { Metadata } from "next";
import Link from "next/link";
import "../marketing.css";

export const metadata: Metadata = {
  title: "About — Navigator",
  description: "Navigator helps parents prepare for their child's psychiatric appointments.",
};

export default function AboutPage() {
  return (
    <>
      {/* Dark nav bar */}
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
            <Link href="/story">Our story</Link>
            <Link href="/waitlist">Join the waitlist</Link>
          </nav>
          <Link href="/waitlist" className="btn btn-primary">
            Join the waitlist
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="hero"
        style={{ paddingBlock: "var(--space-24) var(--space-16)" }}
      >
        <div className="container" style={{ maxWidth: 860 }}>
          <span className="hero-pill" style={{ marginBottom: 24, display: "inline-flex" }}>
            <span className="live" />
            Closed beta · summer 2026
          </span>
          <h1
            style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              fontWeight: "var(--weight-bold)",
              lineHeight: 1.05,
              letterSpacing: "var(--tracking-tight)",
              color: "var(--fg-on-dark-1)",
              margin: 0,
              maxWidth: "18ch",
            }}
          >
            One place for your child&rsquo;s{" "}
            <span style={{ fontStyle: "italic", fontWeight: "var(--weight-regular)", color: "var(--gold-on-dark)" }}>
              complex care.
            </span>
          </h1>
          <p
            style={{
              marginTop: 24,
              fontSize: "clamp(17px, 1.3vw, 20px)",
              lineHeight: 1.55,
              color: "var(--fg-on-dark-2)",
              maxWidth: "52ch",
            }}
          >
            Navigator is built for parents navigating the gap between appointments — the 30 to 90
            days where everything happens, nothing gets written down, and the psychiatrist has
            15 minutes to ask.
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="strip">
        <div className="container strip-inner">
          <div className="strip-item">
            <span className="ic">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            HIPAA-ready · BAA-backed
          </div>
          <div className="strip-item">
            <span className="ic">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
            </span>
            Local-first · saved on your device
          </div>
          <div className="strip-item">
            <span className="ic">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </span>
            Works fully offline
          </div>
          <div className="strip-item">
            <span className="ic">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            Your data stays yours
          </div>
        </div>
      </section>

      {/* Main content */}
      <main style={{ background: "var(--surface-page, #FAFAF7)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px 96px" }}>

          {/* Who it's for */}
          <section style={{ marginBottom: 80 }}>
            <div className="eyebrow-section">
              <span className="bar" />
              Who Navigator is for
            </div>
            <h2 className="mkt-h2" style={{ maxWidth: "24ch" }}>
              Parents doing the hardest version of{" "}
              <span className="it">this job.</span>
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 24,
                marginTop: 40,
              }}
            >
              {[
                {
                  title: "ADHD",
                  body: "Managing stimulants, boosters, and non-stimulants across a school day — plus the 3 pm wear-off window nobody warned you about.",
                },
                {
                  title: "Mood disorders",
                  body: "Tracking mood stabilizers, episode patterns, and the weeks between titrations while school and home both need an explanation.",
                },
                {
                  title: "Autism and co-occurring conditions",
                  body: "Logging concurrent medications, sensory observations, and IEP updates alongside behavioral patterns.",
                },
                {
                  title: "Complex regimens",
                  body: "Four medications. Two providers. One school. Navigator puts it all on a single timeline so you can walk in prepared.",
                },
              ].map((card) => (
                <div key={card.title} className="feat-card">
                  <h3 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)", color: "var(--fg-1)" }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: "var(--text-base)", color: "var(--fg-2)", lineHeight: "var(--lh-normal)" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Core value */}
          <section
            className="section--alt"
            style={{
              borderRadius: "var(--radius-2xl)",
              padding: "56px 48px",
              marginBottom: 80,
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="eyebrow-section">
              <span className="bar" />
              What Navigator does
            </div>
            <h2 className="mkt-h2" style={{ maxWidth: "28ch", marginBottom: 24 }}>
              Prepare for appointments. Track medications.{" "}
              <span className="it">See patterns.</span>
            </h2>
            <p className="lead">
              Log a dose in one tap. Voice-record an observation from the school parking lot.
              When the appointment comes, tap once and walk in with 90 days laid out clearly —
              adherence rates, behavioral patterns, school incidents, medication adjustments.
            </p>
            <p className="lead" style={{ marginTop: 16 }}>
              Everything stays on your device. You decide what to share and with whom.
            </p>
          </section>

          {/* Privacy-first */}
          <section style={{ marginBottom: 80 }}>
            <div className="eyebrow-section">
              <span className="bar" />
              Privacy first
            </div>
            <h2 className="mkt-h2" style={{ maxWidth: "24ch" }}>
              Your child&rsquo;s data{" "}
              <span className="it">never leaves your device</span>{" "}
              unless you choose.
            </h2>
            <p className="lead" style={{ marginTop: 24 }}>
              Navigator is local-first. Every dose, observation, and event saves instantly to
              encrypted storage on your phone or tablet — before it goes anywhere else. Sync to
              the cloud is optional, encrypted end-to-end, and covered by a signed Business
              Associate Agreement. If you never enable sync, no health data ever touches our
              servers.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
              <Link href="/privacy" className="btn btn-ghost btn-sm" style={{ borderRadius: "var(--radius-full)" }}>
                Read our privacy policy
              </Link>
            </div>
          </section>

          {/* Origin story */}
          <section
            style={{
              background: "var(--surface-dark)",
              color: "var(--fg-on-dark-1)",
              borderRadius: "var(--radius-2xl)",
              padding: "56px 48px",
              marginBottom: 80,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-20% -10% auto auto",
                width: "50%",
                height: "100%",
                background: "radial-gradient(ellipse at center, rgba(15, 110, 86, 0.18), transparent 65%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative" }}>
              <div className="eyebrow-section">
                <span className="bar" />
                Why we built this
              </div>
              <h2 className="mkt-h2" style={{ maxWidth: "28ch", marginBottom: 24 }}>
                <span style={{ fontStyle: "italic", fontWeight: "var(--weight-regular)", color: "var(--gold-on-dark)" }}>
                  [Story of why Navigator was built]
                </span>
              </h2>
              <p
                style={{
                  fontSize: "var(--text-md)",
                  lineHeight: "var(--lh-relaxed)",
                  color: "var(--fg-on-dark-2)",
                  maxWidth: "60ch",
                  marginBottom: 16,
                }}
              >
                [Founder name] built Navigator after [reason]. Add your story here — the
                specific moment that made you realize the gap between what parents know and
                what they can communicate to a clinician in 15 minutes. This is the most
                important paragraph on the page. Make it personal and specific.
              </p>
              <p
                style={{
                  fontSize: "var(--text-base)",
                  lineHeight: "var(--lh-relaxed)",
                  color: "var(--fg-on-dark-3)",
                  maxWidth: "60ch",
                  fontStyle: "italic",
                }}
              >
                &ldquo;[A one-sentence version of why this matters, in your own words.]&rdquo;
              </p>
            </div>
          </section>

          {/* CTA */}
          <section style={{ textAlign: "center" }}>
            <h2 className="mkt-h2" style={{ marginBottom: 20 }}>
              Ready to walk into your next appointment{" "}
              <span className="it">prepared?</span>
            </h2>
            <p className="lead" style={{ margin: "0 auto 32px", textAlign: "center" }}>
              Closed beta opens summer 2026 with 50 families. Join the waitlist to hold your spot.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/waitlist" className="btn btn-primary btn-lg">
                Join the waitlist
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 4 }}>
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
              <Link href="/story" className="btn btn-ghost btn-lg">
                Read the story
              </Link>
            </div>
            <p
              style={{
                marginTop: 20,
                fontSize: "var(--text-xs)",
                color: "var(--fg-3)",
              }}
            >
              Navigator does not diagnose, prescribe, or treat. For clinical decisions, always
              consult your child&rsquo;s provider.
            </p>
          </section>

        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <Link href="/" className="brand" style={{ textDecoration: "none" }}>
                <span className="brand-mark">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 19V5l14 14V5" />
                  </svg>
                </span>
                Navigator
              </Link>
              <p className="footer-tagline">
                One place for your child&rsquo;s care. Built local-first. For the parent doing this
                between school pickup and dinner.
              </p>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><Link href="/#tracker">Medication tracker</Link></li>
                <li><Link href="/#report">Clinical report</Link></li>
                <li><Link href="/#how">How it works</Link></li>
                <li><Link href="/#security">Security</Link></li>
                <li><Link href="/#faq">FAQ</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><Link href="/about">About</Link></li>
                <li><Link href="/story">Story</Link></li>
                <li><a href="mailto:hello@getnavigator.app">Contact</a></li>
                <li><Link href="/waitlist">Join the waitlist</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <ul>
                <li><Link href="/privacy">Privacy policy</Link></li>
                <li><Link href="/terms">Terms of service</Link></li>
                <li><Link href="/#security">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="legal">
              © 2026 Navigator · made by Gigabit. Navigator does not diagnose, prescribe, or treat.
              For clinical decisions, always consult your child&rsquo;s provider.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
