/** PromptLab SW — network-first for app shell; avoid stale hashed JS on mobile. */
const CACHE_NAME = "promptlab-shell-v4";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/promptlab-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isHashedAsset(pathname) {
  return pathname.startsWith("/assets/") || pathname.includes("/assets/");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed Vite bundles must always come from network (stale SW caused blank app on phones).
  if (isHashedAsset(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match("/index.html")) ||
            (await caches.match("/"));
          if (cached) return cached;
          throw new Error("offline");
        })
    );
    return;
  }

  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
              }
              return response;
            })
            .catch(() => cached)
      )
    );
  }
});
