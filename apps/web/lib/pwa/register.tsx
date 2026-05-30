"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Registers the service worker so Navigator installs as a PWA and works
 * offline. Production only — a SW in dev fights Next's HMR.
 *
 * Update safety: the SW never calls skipWaiting() on its own. When a new
 * version finishes installing and sits in the `waiting` state, we surface a
 * calm prompt. On accept, we post SKIP_WAITING and reload once the new worker
 * takes control (controllerchange). This means the user is never updated
 * mid-log without their say-so.
 */
export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    // When the controlling worker changes (after SKIP_WAITING), reload once so
    // the page is served by the new version.
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const trackWaiting = (registration: ServiceWorkerRegistration) => {
      // Already waiting (installed before this page loaded).
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }
      // A new worker started installing — watch it reach `installed`.
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // `installed` + an existing controller = an update is waiting (not a
          // first install).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting ?? installing);
          }
        });
      });
    };

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(trackWaiting)
        .catch(() => {
          // Registration failures are non-fatal — the app still works online.
        });
    };
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  return <UpdatePrompt onReload={applyUpdate} onDismiss={() => setWaitingWorker(null)} />;
}

function UpdatePrompt({ onReload, onDismiss }: { onReload: () => void; onDismiss: () => void }) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="App update available"
      style={{
        position: "fixed",
        insetInline: "1rem",
        bottom: "calc(1rem + env(safe-area-inset-bottom))",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        maxWidth: "28rem",
        marginInline: "auto",
        padding: "0.875rem 1rem",
        background: "var(--surface-card-raised)",
        color: "var(--fg-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.4 }}>
        A new version is ready. Reload to update.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            minHeight: "44px",
            minWidth: "44px",
            padding: "0 0.75rem",
            fontSize: "0.875rem",
            color: "var(--fg-2)",
            background: "transparent",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onReload}
          style={{
            minHeight: "44px",
            padding: "0 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--fg-on-accent)",
            background: "var(--color-accent-600)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}
