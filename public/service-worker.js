const CACHE_NAME = 'nsrnb-hwatu-shell-v7';
const HWATU_CARDS = Array.from({ length: 12 }, (_, month) =>
  Array.from({ length: 4 }, (_, card) => `/cards/hwatu/m${String(month + 1).padStart(2, '0')}-${String(card + 1).padStart(2, '0')}.svg`)
).flat();
const APP_SHELL = ['/', '/startup.css', '/manifest.webmanifest', '/icons/hwatu-icon-192.png', '/icons/hwatu-icon-512.png', ...HWATU_CARDS];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached ?? fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
