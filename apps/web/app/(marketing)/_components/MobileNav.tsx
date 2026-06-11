"use client";

import { useEffect, useId, useRef, useState } from "react";

/* ── Inline icons (self-contained so MobileNav stays decoupled from page.tsx) ── */
function MenuIcon({ open }: { open: boolean }) {
  const p = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return open ? (
    <svg {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg {...p}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#tracker", label: "Medication tracker" },
  { href: "#report", label: "Clinical report" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
  { href: "/sign-in", label: "Sign in" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /* Close on Escape and on outside click while open. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="mobile-nav" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="mobile-nav-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <MenuIcon open={open} />
      </button>
      <div
        id={panelId}
        className="mobile-nav-panel"
        hidden={!open}
      >
        <nav className="mobile-nav-links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a
            href="/sign-in"
            className="mobile-nav-cta"
            onClick={() => setOpen(false)}
          >
            Get started
          </a>
        </nav>
      </div>
    </div>
  );
}
