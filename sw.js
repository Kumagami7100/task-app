const CACHE_NAME = 'zubora-v1';
const urlsToCache = [
  '/task-app/',
  '/task-app/index.html',
  '/task-app/style.css',
  '/task-app/app.js',
  '/task-app/icons/icon-192.png',
  '/task-app/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
