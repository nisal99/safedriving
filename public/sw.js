/* Service worker: makes the installed app open instantly and work offline.
 * - Pages: network first (always fresh when online), cached copy when offline.
 * - Built assets (/_next/static), icons and question pictures: cache first.
 * The "Save for offline" button in the app fills the same caches with every page and picture. */
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const CORE = ["/", "/questions", "/practice", "/mock", "/wrong", "/settings", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/q-images/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // KoROAD videos etc. go straight to the network

  if (isAsset(url)) {
    event.respondWith(
      caches.match(req, { ignoreSearch: url.pathname.startsWith("/q-images/") }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(ASSETS).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and data requests: network first, fall back to the cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(PAGES).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(async () => {
        // Next.js navigation data (RSC) must only match exactly; on a miss the router falls back to a
        // full page load, which is served from the cached HTML below.
        const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
        const hit = (await caches.match(req)) || (isRsc ? undefined : await caches.match(req, { ignoreSearch: true }));
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("/")) || Response.error();
        return Response.error();
      }),
  );
});
