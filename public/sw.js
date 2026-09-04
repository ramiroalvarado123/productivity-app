const STATIC_CACHE = "avora-static-v1";
const PRECACHE = ["/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("avora-") && key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPublicAsset =
    url.pathname === "/favicon.svg" ||
    url.pathname === "/api/pwa-icon" ||
    url.pathname.startsWith("/_next/static/");

  if (!isPublicAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)));
        return response;
      });
    }),
  );
});
