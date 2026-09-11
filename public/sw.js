/* AVORA push service worker v2026-09-11-stats. Mantenerlo en la raíz pública para actualizar la PWA sin reinstalarla. */
self.addEventListener("install", () => {
  // La nueva versión queda activa sin esperar a que se cierren todas las pestañas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Toma el control de las pestañas existentes para aplicar los deploys enseguida.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Solo controlamos navegaciones de AVORA. Los assets siempre se piden a red
  // para evitar que un bundle viejo quede instalado después de un deploy.
  if (url.origin !== self.location.origin || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "AVORA";
  const options = {
    body: payload.body || "Tenés una novedad en AVORA.",
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    tag: payload.tag || "avora-notification",
    renotify: false,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? new URL(event.notification.data.url, self.location.origin).href
    : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
