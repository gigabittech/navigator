/* Navigator service worker — app-shell cache + offline fallback.
 *
 * The data layer is local (PGlite/IndexedDB), so the app needs no network to
 * function. This SW just keeps the shell (HTML + JS + icons) available offline:
 *   - navigations: network-first, fall back to cache, then /offline
 *   - static assets: stale-while-revalidate
 *
 * Update safety: the cache name is versioned via CACHE_VERSION. Bump it on
 * every deploy that should bust the shell cache (a deploy step may also
 * string-replace the literal below with a build hash). A new SW does NOT call
 * skipWaiting() on its own — it waits until the page tells it to, so the user
 * is never updated out from under an in-progress log. The page surfaces a calm
 * "a new version is ready" prompt and posts SKIP_WAITING when the user accepts.
 */

const CACHE_VERSION = "v2";
const CACHE = `navigator-${CACHE_VERSION}`;

/* Precache the start_url shell (/today) so a first launch offline still boots,
 * plus the offline fallback and install assets. */
const PRECACHE = [
  "/today",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  // Cache the shell, but do NOT skipWaiting here — the new worker stays in the
  // waiting state until the page confirms the user wants to update.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Don't let one missing asset (e.g. a not-yet-built route) fail the whole
      // install — cache what we can, individually.
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            // A single asset failing to precache is non-fatal; it'll be fetched
            // and cached on first use instead.
          }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page posts this once the user accepts the update prompt.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Push notifications ──────────────────────────────────────────────────────
// Dose reminders are sent by a server function (supabase/functions/send_reminders)
// to subscriptions stored per device. The payload is JSON:
//   { title, body, url?, tag? }
// Voice-compliant copy is set by the server; the SW just renders it.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Navigator", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Navigator";
  const options = {
    body: data.body || "",
    tag: data.tag || "navigator-reminder",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/today" },
    // Reminders shouldn't stack silently; renotify replaces a prior one.
    renotify: Boolean(data.tag),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab if one is open, else open the target route.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/today").then((shell) => shell || caches.match("/offline"))),
        ),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname.startsWith("/fonts") ||
    url.pathname === "/manifest.json";

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
