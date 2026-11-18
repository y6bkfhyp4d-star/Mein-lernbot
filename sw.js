/* NERYX: konservativer Service Worker – Netzwerk bevorzugen, keine JS-Caches. */
const CACHE = 'neryx-recovery-v2';
const OLD_PREFIXES = ['neryx-app-', 'lernbot-v', 'neryx-recovery-'];

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key =>
      key !== CACHE && OLD_PREFIXES.some(prefix => key.startsWith(prefix))
    ).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // HTML und JavaScript immer frisch anfordern: keine veralteten Programmdateien.
  if (req.mode !== 'navigate') {
    event.respondWith(fetch(req, {cache:'no-store'}));
    return;
  }
  event.respondWith((async () => {
    try {
      const response = await fetch(req, {cache:'no-store'});
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put('./index.html', response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(CACHE);
      return (await cache.match('./index.html')) || Response.error();
    }
  })());
});
