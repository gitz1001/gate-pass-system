const CACHE_NAME = 'pgp-cache-v1';
const urlsToCache = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/utils.js',
  './js/icons.js',
  './js/models/AppModel.js',
  './js/services/SheetsService.js',
  './js/controllers/AppController.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests, ignore POST/API calls
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});
