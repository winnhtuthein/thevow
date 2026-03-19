const CACHE = 'thevow-v2';
const ASSETS = [
  '/thevow/',
  '/thevow/index.html',
  '/thevow/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/thevow/index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const action = e.action;
  const vowId = e.notification.data?.vowId;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) {
        cls[0].focus();
        cls[0].postMessage({ action, vowId });
      } else {
        clients.openWindow('/thevow/');
      }
    })
  );
});
