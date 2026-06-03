"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Cookieless analytics (Plausible), gated on the Global Privacy Control signal.
 *
 * Colorado's CPA (and the proposal's privacy commitments) require respecting the
 * universal opt-out signal. GPC is a client-only browser flag
 * (navigator.globalPrivacyControl), so this must run on the client: if GPC is
 * set, we never load the analytics script at all. Plausible is already
 * cookieless and sells nothing — honoring GPC here is the strict, defensible
 * posture.
 */
export function Analytics({ domain }: { domain: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Default to NOT loading; only opt in when GPC is absent/false.
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl;
    setAllowed(gpc !== true && process.env.NODE_ENV === "production");
  }, []);

  if (!allowed) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
