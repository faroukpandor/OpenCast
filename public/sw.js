/* OpenCast offline shell. Never cache authentication, discussions, analytics, or personalized API responses. */
const CACHE = '__BUILD_CACHE__';
const CORE = __PRECACHE__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('opencast-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/') || event.request.headers.has('authorization')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok && new URL(response.url).origin === url.origin) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('/index.html',copy))); }
      return response;
    }).catch(async () => (await caches.match('/index.html')) || new Response('OpenCast is offline. Connect once to cache the app.',{ status:503,headers:{ 'Content-Type':'text/plain' } })));
    return;
  }
  if (url.pathname.startsWith('/assets/') || CORE.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(async cache => { await cache.put(event.request,copy); const keys=await cache.keys(); if(keys.length>120) await cache.delete(keys[0]); })); }
      return response;
    })).catch(() => new Response('This asset is not cached.',{ status:503 })));
  }
});
