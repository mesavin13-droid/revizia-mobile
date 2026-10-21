const CACHE = 'revizia-offline-v3';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch('/index.html', {cache: 'no-store'});
      if (!response.ok) return;
      await cache.put('/index.html', response.clone());
      await cache.put('/', response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
      await Promise.allSettled(assets.map(asset => cache.add(asset)));
    } catch (e) { /* first load may complete without persistent offline cache */ }
  })());
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('revizia-offline-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(async response => {if (response.ok) (await caches.open(CACHE)).put('/index.html', response.clone());return response;}).catch(async () => (await caches.match('/index.html')) || Response.error()));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(async response => {if(response.ok) (await caches.open(CACHE)).put(req, response.clone());return response;})));
});
