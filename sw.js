
const CACHE = "lernbot-v2";

const FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(FILES);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const important =
    event.request.mode === "navigate" ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/index.html");

  event.respondWith(
    (async () => {
      if (important) {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          return (
            await caches.match(event.request) ||
            await caches.match("./index.html")
          );
        }
      }

      const cached = await caches.match(event.request);
      if (cached) return cached;

      return fetch(event.request);
    })()
  );
});
