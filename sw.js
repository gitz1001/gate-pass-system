const CACHE_NAME = 'pgp-cache-v12';
const urlsToCache = [
  './index.html',
  './css/styles.css',
  './js/main.js',

  './js/utils.js',
  './js/icons.js',
  './js/lib/jsQR.min.js',
  './logo.png',
  './js/models/AppModel.js',
  './js/services/SheetsService.js',
  './js/controllers/AppController.js',
  './manifest.json'
];

const cdnUrls = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache local files normally
        cache.addAll(urlsToCache);
        
        // Cache CDNs as opaque responses
        return Promise.all(cdnUrls.map(url => {
          return fetch(new Request(url, { mode: 'no-cors' })).then(response => {
            return cache.put(url, response);
          });
        }));
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages immediately
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Exclude Google Apps Script API calls from being intercepted/cached
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;

        // If not in cache, try fetching from network
        return fetch(event.request).then(networkResponse => {
          // Dynamically cache new valid GET requests (like images)
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
  );
});
