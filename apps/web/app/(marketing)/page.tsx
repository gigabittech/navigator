import "./marketing.css";
import Link from "next/link";
import { WaitlistForm } from "./waitlist/_components/WaitlistForm";

/* ── Inline SVG icons (Lucide subset matching the design) ── */
function Icon({ name, size = 20, strokeWidth = 2, className = "" }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, className };
  switch (name) {
    case "arrow-right": return <svg {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
    case "check": return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case "check-circle": return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
    case "pill": return <svg {...p}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>;
    case "mic": return <svg {...p}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
    case "file-text": return <svg {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>;
    case "sparkles": return <svg {...p}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>;
    case "shield": return <svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "cloud-check": return <svg {...p}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9 14 2 2 4-4"/></svg>;
    case "wifi-off": return <svg {...p}><path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/></svg>;
    case "lock": return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "database": return <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
    case "plus": return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "home": return <svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case "list": return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case "bar-chart": return <svg {...p}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
    case "user": return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case "mail": return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>;
    case "phone-icon": return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case "trending-up": return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case "alert-circle": return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case "printer": return <svg {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
    case "twitter": return <svg {...p}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>;
    case "linkedin": return <svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
    case "github": return <svg {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>;
    case "logo": return <svg {...p}><path d="M5 19V5l14 14V5" strokeWidth={2.4}/></svg>;
    case "x-circle": return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
    default: return null;
  }
}

/* ── Brand mark ── */
function Brand() {
  return (
    <a href="#top" className="brand">
      <span className="brand-mark"><Icon name="logo" size={18} /></span>
      Navigator
    </a>
  );
}

/* ── Nav ── */
function Nav() {
  return (
    <header className="nav" id="top">
      <div className="container nav-inner">
        <Brand />
        <nav className="nav-links" aria-label="Primary">
          <a href="#problem">The problem</a>
          <a href="#tracker">Medication tracker</a>
          <a href="#report">Clinical report</a>
          <a href="#security">Security</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href="#waitlist" className="btn btn-primary">
          Join the waitlist <Icon name="arrow-right" size={16} />
        </a>
      </div>
    </header>
  );
}

/* ── Phone mock ── */
function PhoneMock() {
  return (
    <div style={{ position: "relative" }}>
      <div className="phone">
        <div className="phone-notch"></div>
        <div className="phone-screen">
          <div className="phone-status">
            <span>9:41</span>
            <span className="right">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </span>
          </div>
          <div className="phone-content">
            <div className="p-topbar">
              <div className="p-child">
                <div className="p-avatar">E</div>
                <span>Ezra · 9 yrs</span>
              </div>
              <span className="p-sync"><span className="d"></span>Saved</span>
            </div>
            <div className="p-hello">
              <div className="day">Friday · May 22</div>
              <div className="h">Good morning.</div>
            </div>
            <div className="p-card">
              <div className="p-card-head">
                <span className="t">Today&rsquo;s schedule</span>
                <span className="m">2 of 4</span>
              </div>
              <div className="p-row">
                <div className="p-ic ok"><Icon name="check-circle" size={15} /></div>
                <div>
                  <div className="nm">Methylphenidate · 15 mg</div>
                  <div className="sub">7:42 am · +12 min</div>
                </div>
                <span className="p-pill">Logged</span>
              </div>
              <div className="p-row">
                <div className="p-ic ok"><Icon name="check-circle" size={15} /></div>
                <div>
                  <div className="nm">Guanfacine · 2 mg</div>
                  <div className="sub">7:45 am · +15 min</div>
                </div>
                <span className="p-pill">Logged</span>
              </div>
              <div className="p-row">
                <div className="p-ic late"><Icon name="clock" size={15} /></div>
                <div>
                  <div className="nm">Methylphenidate · 10 mg</div>
                  <div className="sub">Scheduled 12:00 pm</div>
                </div>
                <button className="p-btn">Taken</button>
              </div>
              <div className="p-row">
                <div className="p-ic pending"><Icon name="pill" size={15} /></div>
                <div>
                  <div className="nm">Sertraline · 25 mg</div>
                  <div className="sub">Scheduled 8:00 pm</div>
                </div>
                <button className="p-btn">Taken</button>
              </div>
            </div>
            <div className="p-pattern">
              <div className="p-pattern-head">
                <span className="t">Wear-off · day 4</span>
                <span className="pill">pattern</span>
              </div>
              <p>Irritability returning ~3h post-morning dose for 4 days. Worth raising at the May 28 visit.</p>
            </div>
          </div>
          <div className="p-fab"><Icon name="plus" size={22} /></div>
          <div className="p-tabs">
            <div className="p-tab active"><span className="ic"><Icon name="home" size={20} /></span>Today</div>
            <div className="p-tab"><span className="ic"><Icon name="list" size={20} /></span>Log</div>
            <div className="p-tab"><span className="ic"><Icon name="bar-chart" size={20} /></span>Patterns</div>
            <div className="p-tab"><span className="ic"><Icon name="file-text" size={20} /></span>Report</div>
          </div>
        </div>
      </div>
      {/* Floating cards */}
      <div className="float-card" style={{ left: "-32px", top: "60px" }}>
        <div className="ic-wrap" style={{ background: "rgba(15, 110, 86, 0.10)", color: "var(--accent)" }}>
          <Icon name="cloud-check" size={18} />
        </div>
        <div>
          <div className="lbl">Synced</div>
          <div className="val">Across all devices</div>
        </div>
      </div>
      <div className="float-card" style={{ right: "-28px", bottom: "120px" }}>
        <div className="ic-wrap" style={{ background: "rgba(201, 168, 76, 0.16)", color: "var(--gold-600)" }}>
          <Icon name="sparkles" size={18} />
        </div>
        <div>
          <div className="lbl">Pattern found</div>
          <div className="val">3pm wear-off · day 4</div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="hero-pill">
            <span className="live"></span> Closed beta · summer 2026
          </span>
          <h1>
            Take back control of your child&rsquo;s{" "}
            <span className="it">therapeutic care.</span>
          </h1>
          <p className="lead">
            You shouldn&rsquo;t have to reconstruct your child&rsquo;s last three months from
            memory. Navigator is one place to track medications, school events, and
            observations — and walk into every appointment prepared.
          </p>
          <div className="hero-cta">
            <a href="#waitlist" className="btn btn-primary btn-lg">
              Join the waitlist <Icon name="arrow-right" size={18} />
            </a>
            <a href="#report" className="btn btn-ghost btn-lg">See a sample report</a>
          </div>
          <div className="hero-trust">
            <span className="item"><Icon name="shield" size={14} /> HIPAA-ready</span>
            <span className="sep"></span>
            <span className="item"><Icon name="wifi-off" size={14} /> Works offline</span>
            <span className="sep"></span>
            <span className="item"><Icon name="lock" size={14} /> Your data stays yours</span>
          </div>
        </div>
        <div className="phone-wrap">
          <PhoneMock />
        </div>
      </div>
      <div className="container hero-stats">
        <div className="hero-stat">
          <div className="n">15 min</div>
          <div className="l">Average psychiatrist appointment</div>
        </div>
        <div className="hero-stat">
          <div className="n">30–90 days</div>
          <div className="l">Between every appointment</div>
        </div>
        <div className="hero-stat">
          <div className="n">150+</div>
          <div className="l">Medications Navigator tracks</div>
        </div>
        <div className="hero-stat">
          <div className="n">1 tap</div>
          <div className="l">To generate a 90-day report</div>
        </div>
      </div>
    </section>
  );
}

/* ── Trust strip ── */
function TrustStrip() {
  return (
    <section className="strip">
      <div className="container strip-inner">
        <div className="strip-item"><span className="ic"><Icon name="shield" size={16} /></span>HIPAA-ready · BAA-backed</div>
        <div className="strip-item"><span className="ic"><Icon name="database" size={16} /></span>Local-first · saved on your device</div>
        <div className="strip-item"><span className="ic"><Icon name="wifi-off" size={16} /></span>Works fully offline</div>
        <div className="strip-item"><span className="ic"><Icon name="lock" size={16} /></span>End-to-end encrypted</div>
        <div className="strip-item"><span className="ic"><Icon name="sparkles" size={16} /></span>AI never trains on your data</div>
      </div>
    </section>
  );
}

/* ── Problem ── */
function ScatterItem({ icon, name, sub, style }: { icon: string; name: string; sub: string; style: React.CSSProperties }) {
  return (
    <div className="scatter-item" style={style}>
      <span className="glyph"><Icon name={icon} size={18} /></span>
      <div>
        <div>{name}</div>
        <div className="sub">{sub}</div>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section className="section" id="problem">
      <div className="container">
        <div style={{ maxWidth: 880 }}>
          <div className="eyebrow-section"><span className="bar"></span> The problem</div>
          <h2 className="mkt-h2">
            Nobody told you that you were going to become a{" "}
            <span className="it">case manager</span> for your own kid.
          </h2>
          <p className="lead" style={{ marginTop: "var(--space-6)" }}>
            You&rsquo;re managing medications, school emails, provider relationships, and a
            co-parent — all in your head. When the psychiatrist asks how things have been,
            you give a vague answer. Not because you don&rsquo;t know. Because you have no
            system to present what you know.
          </p>
        </div>

        <div className="scatter" aria-hidden="true">
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="none">
            <defs>
              <pattern id="dashed" patternUnits="userSpaceOnUse" width="8" height="1">
                <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(14, 27, 48, 0.18)" strokeWidth="1.4"/>
              </pattern>
            </defs>
            <line x1="14%" y1="22%" x2="46%" y2="48%" stroke="url(#dashed)" strokeDasharray="4 4"/>
            <line x1="86%" y1="22%" x2="54%" y2="48%" stroke="url(#dashed)" strokeDasharray="4 4"/>
            <line x1="10%" y1="78%" x2="46%" y2="52%" stroke="url(#dashed)" strokeDasharray="4 4"/>
            <line x1="90%" y1="78%" x2="54%" y2="52%" stroke="url(#dashed)" strokeDasharray="4 4"/>
            <line x1="50%" y1="8%" x2="50%" y2="38%" stroke="url(#dashed)" strokeDasharray="4 4"/>
          </svg>
          <ScatterItem icon="phone-icon" name="Notes app" sub="Half-typed thoughts" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }} />
          <ScatterItem icon="mail" name="School emails" sub="Buried in inbox" style={{ top: "18%", left: "4%" }} />
          <ScatterItem icon="pill" name="Rx bottle" sub="The actual schedule" style={{ top: "18%", right: "4%" }} />
          <ScatterItem icon="mail" name="Co-parent texts" sub="Scattered messages" style={{ bottom: "12%", left: "2%" }} />
          <ScatterItem icon="user" name="Your memory" sub="The most fragile" style={{ bottom: "12%", right: "2%" }} />
          <div className="scatter-center">
            <span style={{ color: "var(--accent)", display: "flex", justifyContent: "center", marginBottom: 12 }}><Icon name="alert-circle" size={28} /></span>
            <h4>Your child&rsquo;s story</h4>
            <p>Scattered across five places — none of them designed for it.</p>
          </div>
        </div>

        <div className="prob-stats">
          <div className="prob-stat">
            <div className="n">15<span className="u">min</span></div>
            <div className="l">Average psychiatrist visit. You&rsquo;re trying to recall ninety days in twelve sticky notes.</div>
          </div>
          <div className="prob-stat">
            <div className="n">30–90<span className="u">days</span></div>
            <div className="l">Between every appointment. A lot of life happens — and gets forgotten — in that gap.</div>
          </div>
          <div className="prob-stat">
            <div className="n">~70<span className="u">%</span></div>
            <div className="l">Of patterns get missed without a system. Wear-off windows, trigger clusters, sleep-mood links.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Big quote ── */
function BigQuote() {
  return (
    <section className="bigquote">
      <div className="container">
        <blockquote>
          I feel like I am the only one who knows my kid — but no one is asking me the right questions.
        </blockquote>
        <div className="by">Parent of a child with complex ADHD</div>
      </div>
    </section>
  );
}

/* ── Feature 01 — Med tracker ── */
function MedTracker() {
  return (
    <section className="section" id="tracker">
      <div className="container">
        <div className="feat-split">
          <div className="feat-text">
            <div className="eyebrow-section"><span className="bar"></span> Feature 01 · Medication tracker</div>
            <h2 className="mkt-h2">
              Built for the <span className="it">hardest version</span> of the problem.
            </h2>
            <p className="lead">
              Most apps track one stimulant. Navigator tracks 150+ medications — including mood
              stabilizers, antipsychotics, and non-stimulants — and shows how they interact with
              each other and with daily life. Log timing, dosage, and observations across
              concurrent medications. See it all on one timeline.
            </p>
            <div className="callout-stat">
              <div className="n">150+</div>
              <div className="l">Medications tracked across every major class</div>
            </div>
            <div className="feat-list">
              {["Stimulants","Non-stimulants","Mood stabilizers","Antipsychotics","SSRIs / SNRIs","Concurrent regimens"].map(item => (
                <div key={item} className="it"><Icon name="check" size={18} className="check" /> {item}</div>
              ))}
            </div>
          </div>
          <div className="meds-card">
            <div className="meds-card-head">
              <span className="t">Today · 4 concurrent meds</span>
              <span className="pill">All logged</span>
            </div>
            {[
              { name: "Adderall XR", dose: "20 mg", time: "7:32 am" },
              { name: "Abilify", dose: "5 mg", time: "7:35 am" },
              { name: "Lamictal", dose: "50 mg", time: "8:10 am" },
              { name: "Intuniv", dose: "1 mg", time: "8:12 am" },
            ].map(med => (
              <div key={med.name} className="med-row">
                <span className="med-pill"><Icon name="pill" size={18} /></span>
                <div>
                  <div className="med-name">{med.name}</div>
                  <div className="med-dose">{med.dose}</div>
                </div>
                <span className="med-time">{med.time}</span>
                <span className="med-check"><Icon name="check-circle" size={18} /></span>
              </div>
            ))}
            <div className="meds-stat">
              <span>Adherence this week · <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>94%</span></span>
              <span>Wear-off pattern detected · day 4</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Feature 02 — Clinical report ── */
function ClinicalReport() {
  return (
    <section className="section section--dark" id="report">
      <div className="container">
        <div className="feat-split reverse">
          <div className="feat-text">
            <div className="eyebrow-section"><span className="bar"></span> Feature 02 · Appointment prep</div>
            <h2 className="mkt-h2">
              Walk in with a clinical report. <span className="it">Not a reconstruction.</span>
            </h2>
            <p className="lead">
              Before every appointment, tap Generate Report. Navigator produces a clean clinical
              summary covering everything that actually happened over the last 90 days. Hand it
              to the provider. Watch them pause and read it.
            </p>
            <div style={{ marginTop: "var(--space-8)", padding: "20px 22px", borderRadius: "var(--radius-xl)", background: "rgba(201, 168, 76, 0.08)", border: "1px solid rgba(201, 168, 76, 0.20)", fontStyle: "italic", fontSize: "var(--text-md)", lineHeight: 1.55, color: "var(--cream-50)" }}>
              <span style={{ color: "var(--gold-on-dark)", fontWeight: 600, fontStyle: "normal", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>What parents tell us</span>
              &ldquo;This is really helpful.&rdquo; — the doctor pauses, reads it. That has never happened before.
            </div>
          </div>
          <div className="report-card">
            <div className="report-head">
              <div className="report-brand"><span className="glyph">N</span> Navigator clinical report</div>
              <h4>90-Day Summary</h4>
              <div className="meta">Ezra K. · DOB redacted · Feb 23 – May 22, 2026</div>
            </div>
            <div className="report-body">
              {[
                { label: "Medication adherence", h: "94% on-time, 4 medications", p: "3 missed doses (school days). 12 logged as late by <30 min.", stat: "94%", dir: "up", badge: "▲ 6%" },
                { label: "Behavioral episodes", h: "12 logged · down 30% vs. prior period", p: "Largest reductions on weekday mornings post-Adderall titration.", stat: "12", dir: "up", badge: "▼ 30%" },
                { label: "Trigger pattern", h: "After-school window (3–5 pm)", p: "67% of incidents fall in this window. Consistent across the period.", stat: "67%", dir: "flag", badge: "flag" },
                { label: "School observations", h: "4 incidents flagged · IEP meeting pending", p: "Two reading sessions, two transitions. Teacher emails attached.", stat: "4", dir: "flag", badge: "review" },
                { label: "Notable changes", h: "Dose adjustment · week 6", p: "+5 mg Adderall XR. Positive trend in adherence + episode count since.", stat: "+5 mg", dir: "up", badge: "positive" },
              ].map(row => (
                <div key={row.label} className="report-section">
                  <div>
                    <div className="label">{row.label}</div>
                    <h5>{row.h}</h5>
                    <p>{row.p}</p>
                  </div>
                  <div className="stat">{row.stat}<br/><span className={`dir ${row.dir}`}>{row.badge}</span></div>
                </div>
              ))}
            </div>
            <div className="report-cta">
              <span className="gen"><Icon name="sparkles" size={16} /> Generate report</span>
              <a href="#" className="btn btn-sm btn-ghost" style={{ borderColor: "rgba(14, 27, 48, 0.18)", color: "var(--navy-800)" }}>
                <Icon name="printer" size={14} /> Print / share
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How it works ── */
function HowItWorks() {
  return (
    <section className="section section--alt" id="how">
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <div className="eyebrow-section"><span className="bar"></span> How it works</div>
          <h2 className="mkt-h2">Log in seconds. <span className="it">Walk in prepared.</span></h2>
          <p className="lead" style={{ marginTop: "var(--space-5)" }}>
            Designed for the parent doing this between school pickup and dinner. Three steps,
            repeated daily. The fourth happens once every 90 days.
          </p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="ic-wrap"><Icon name="mic" size={22} /></div>
            <div className="num">Log daily</div>
            <h3>Voice or text — 15 seconds</h3>
            <p>Tap a dose. Hold the mic and talk. Navigator transcribes and structures: mood, energy, trigger, side effect.</p>
          </div>
          <div className="step">
            <div className="ic-wrap"><Icon name="sparkles" size={22} /></div>
            <div className="num">AI finds patterns</div>
            <h3>Trigger clusters · wear-off · trend lines</h3>
            <p>Claude organizes what you logged into the patterns a clinician would look for — quietly, in the background.</p>
          </div>
          <div className="step">
            <div className="ic-wrap"><Icon name="file-text" size={22} /></div>
            <div className="num">Generate report</div>
            <h3>One tap · 90-day clinical summary</h3>
            <p>The night before the visit, tap Generate. Hand the printed PDF to your provider, or share a link.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Feature grid ── */
function FeatureRow() {
  const features = [
    { icon: "mic", h: "Voice in, structure out", p: "Talk in the school parking lot. Get back tagged, searchable observations — mood, energy, behavior, trigger." },
    { icon: "cloud-check", h: "Local-first sync", p: "Every tap saves instantly to your device. Sync happens silently in the background, even on bad signal." },
    { icon: "trending-up", h: "Wear-off & pattern detection", p: "Most apps track when a dose was taken. Navigator tracks when it stopped working — the 3pm slide, the post-lunch irritability." },
    { icon: "calendar", h: "Appointment prep mode", p: "A focused pre-visit checklist. Top 3 changes to discuss. Open questions. Ready before you sit down." },
    { icon: "user", h: "Shared with a co-parent", p: "Optional co-parent or caregiver access. Same data, same context, same questions for the doctor." },
    { icon: "file-text", h: "School & IEP timeline", p: "Log school emails, calls home, and IEP updates alongside meds. The whole picture, on one timeline." },
  ];
  return (
    <section className="section">
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <div className="eyebrow-section"><span className="bar"></span> What&rsquo;s inside</div>
          <h2 className="mkt-h2">Small details. <span className="it">Big difference.</span></h2>
        </div>
        <div className="feat-grid">
          {features.map(f => (
            <div key={f.h} className="feat-card">
              <span className="ic"><Icon name={f.icon} size={22} /></span>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Security ── */
function Security() {
  const pillars = [
    { icon: "database", h: "Local-first storage", p: "Every dose, observation, and event saves to encrypted storage on your device before it ever leaves it." },
    { icon: "lock", h: "End-to-end encryption", p: "Sync uses keys derived from your account. We can't read your child's logs — only you can." },
    { icon: "shield", h: "HIPAA-ready, BAA-backed", p: "Our infrastructure providers sign Business Associate Agreements covering every byte of PHI we hold." },
    { icon: "sparkles", h: "AI that never trains on you", p: "When Navigator uses AI to summarize, requests are scoped, redacted, and excluded from training data." },
  ];
  return (
    <section className="section section--alt" id="security">
      <div className="container">
        <div className="security">
          <div>
            <div className="eyebrow-section"><span className="bar"></span> Security &amp; privacy</div>
            <h2 className="mkt-h2">Your child&rsquo;s data <span className="it">stays yours.</span></h2>
            <p className="lead" style={{ marginTop: "var(--space-5)" }}>
              Navigator is built local-first. Every entry saves instantly to your device, encrypted at rest.
              Sync to our servers is encrypted end-to-end, behind a signed Business Associate Agreement.
              Your child&rsquo;s data never trains a model and is never sold.
            </p>
            <div className="hero-trust" style={{ color: "var(--fg-3)" }}>
              <span className="item" style={{ color: "var(--fg-2)" }}>SOC 2 Type II in progress</span>
              <span className="sep" style={{ background: "rgba(14, 27, 48, 0.18)" }}></span>
              <span className="item" style={{ color: "var(--fg-2)" }}>HIPAA-ready</span>
              <span className="sep" style={{ background: "rgba(14, 27, 48, 0.18)" }}></span>
              <span className="item" style={{ color: "var(--fg-2)" }}>BAA-backed infra</span>
            </div>
          </div>
          <div className="sec-pillars">
            {pillars.map(p => (
              <div key={p.h} className="sec-pillar">
                <span className="ic"><Icon name={p.icon} size={20} /></span>
                <div>
                  <h4>{p.h}</h4>
                  <p>{p.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ── */
function Testimonials() {
  const quotes = [
    { q: "I used to walk into Dr. Mehta's office with a knot in my stomach trying to remember what happened in March. Now I have ninety days of context and the right questions written down for me.", name: "Sarah K.", initials: "SK", role: "Parent of a 9-year-old · beta since Apr 2026" },
    { q: "The first time I handed the printed report across the desk, the psychiatrist actually paused and read it. We got to the question I'd been holding for two months in the first ten minutes.", name: "Daniel M.", initials: "DM", role: "Co-parent of an 11-year-old · beta since Mar 2026" },
    { q: "Navigator caught a 3 pm wear-off window I'd been missing for months. Once we adjusted the booster dose, school stopped calling. That's not a feature. That's a different life.", name: "Rina P.", initials: "RP", role: "Parent of a 7-year-old · beta since Feb 2026" },
  ];
  return (
    <section className="section">
      <div className="container">
        <div style={{ maxWidth: 720 }}>
          <div className="eyebrow-section"><span className="bar"></span> Early access voices</div>
          <h2 className="mkt-h2">What beta families <span className="it">are telling us.</span></h2>
        </div>
        <div className="testimonials">
          {quotes.map(t => (
            <div key={t.name} className="testimonial">
              <blockquote>&ldquo;{t.q}&rdquo;</blockquote>
              <div className="by">
                <div className="avatar">{t.initials}</div>
                <div>
                  <div className="name">{t.name}</div>
                  <div className="role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQ() {
  const items = [
    { q: "Is Navigator a replacement for my child's psychiatrist?", a: "No. Navigator does not diagnose, prescribe, or treat. It's a tool to help you organize everything that happens between appointments and present it to the clinicians who do. For clinical decisions, always consult your child's provider." },
    { q: "What medications does Navigator support?", a: "150+ medications across stimulants, non-stimulants, mood stabilizers, antipsychotics, SSRIs, SNRIs, and sleep aids. You can log multiple concurrent medications and see how they interact over time." },
    { q: "Does it work offline?", a: "Yes — completely. Navigator is a local-first PWA. Every dose, observation, and event saves instantly to your device. When you're back online, it syncs quietly in the background. You'll never lose a log because you were on the subway." },
    { q: "Is my child's data private?", a: "Yes. Data is encrypted at rest on your device and end-to-end encrypted in transit. We sign Business Associate Agreements with our infrastructure providers. We don't sell data, and your child's logs never train an AI model." },
    { q: "Can my co-parent or caregiver use it too?", a: "Yes. You can invite a co-parent, grandparent, or caregiver to a shared child profile. Everyone sees the same context, logs to the same timeline, and walks into the appointment with the same questions." },
    { q: "When will I get access?", a: "Closed beta opens summer 2026 with 50 families. Join the waitlist below — we'll email you before your slot is ready. No marketing list, no spam, one email when it's time." },
    { q: "How much will Navigator cost?", a: "During beta, Navigator is free. We'll announce pricing before the beta period ends, with plenty of notice for families to decide. Founding-family pricing will be honored long-term." },
  ];
  return (
    <section className="section section--alt" id="faq">
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div className="eyebrow-section" style={{ justifyContent: "center" }}><span className="bar"></span> FAQ</div>
          <h2 className="mkt-h2">Common questions <span className="it">from parents.</span></h2>
        </div>
        <div className="faq">
          {items.map(item => (
            <details key={item.q} className="faq-item">
              <summary className="faq-q">
                {item.q} <span className="ic"><Icon name="plus" size={20} /></span>
              </summary>
              <div className="faq-a">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ── */
function FinalCTA() {
  return (
    <section className="cta" id="waitlist">
      <div className="container cta-inner">
        <h2>
          You will never have to <span className="it">reconstruct</span>
          <br />your child&rsquo;s story from memory again.
        </h2>
        <p>Closed beta opens summer 2026. We&rsquo;re onboarding our first 50 families.</p>
        <WaitlistForm inline />
        <div className="disclaimer">
          Navigator does not diagnose, prescribe, or treat. For clinical decisions, always
          consult your child&rsquo;s provider. We email once, before beta opens. No marketing list.
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Brand />
            <p className="footer-tagline">
              One place for your child&rsquo;s care. Built local-first. For the parent doing this
              between school pickup and dinner.
            </p>
          </div>
          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="#tracker">Medication tracker</a></li>
              <li><a href="#report">Clinical report</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Company</h5>
            <ul>
              <li><a href="#">About</a></li>
              <li><Link href="/story">Story</Link></li>
              <li><a href="#">Press</a></li>
              <li><a href="mailto:hello@getnavigator.app">Contact</a></li>
              <li><a href="#waitlist">Join the waitlist</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <ul>
              <li><a href="#">For clinicians</a></li>
              <li><a href="#">Sample report (PDF)</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="legal">
            © 2026 Navigator · made by Gigabit. Navigator does not diagnose, prescribe, or treat.
            For clinical decisions, always consult your child&rsquo;s provider.
          </div>
          <div className="footer-socials">
            <a href="#" aria-label="Twitter"><Icon name="twitter" size={16} /></a>
            <a href="#" aria-label="LinkedIn"><Icon name="linkedin" size={16} /></a>
            <a href="#" aria-label="GitHub"><Icon name="github" size={16} /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Page ── */
export default function MarketingHome() {
  return (
    <>
      <Nav />
      <Hero />
      <TrustStrip />
      <Problem />
      <BigQuote />
      <MedTracker />
      <ClinicalReport />
      <HowItWorks />
      <FeatureRow />
      <Security />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}
