// PeaceBoard service worker — minimal offline shell.
// Caches the app shell + static assets so the app can launch without a network,
// and serves a friendly offline fallback for navigations when fully offline.

const VERSION = "v1";
const SHELL_CACHE = `pb-shell-${VERSION}`;
const RUNTIME_CACHE = `pb-runtime-${VERSION}`;

const SHELL_URLS = ["/", "/manifest.webmanifest", "/pwa-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache API or auth requests — always go to network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket")) return;

  // Navigation requests: try network first so users always get fresh HTML,
  // fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put("/", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("/").then((m) => m || new Response(
          "<h1>You're offline</h1><p>Reconnect to keep building kindness.</p>",
          { headers: { "Content-Type": "text/html" } }
        )))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
