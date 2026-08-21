const CACHE_NAME = 'pgp-cache-v30';
const urlsToCache = [
  './index.html',
  './css/styles.css',
  './js/main.js',

  './js/utils.js',
  './js/icons.js',
  './js/lib/jsQR.min.js',
  './logo.png',
  './SISC_logo.png',

  // Models & Services
  './js/models/AppModel.js',
  './js/services/SheetsService.js',
  './js/services/FaceBiometrics.js',

  // Controllers
  './js/controllers/AppController.js',
  './js/controllers/pages/LoginController.js',
  './js/controllers/pages/DashboardController.js',
  './js/controllers/pages/StudentsController.js',
  './js/controllers/pages/ScannerController.js',
  './js/controllers/pages/LogsController.js',
  './js/controllers/pages/PGPController.js',
  './js/controllers/pages/TGPController.js',
  './js/controllers/pages/SettingsController.js',
  './js/controllers/pages/ReportsController.js',

  // Views
  './js/views/AppView.js',
  './js/views/LoginView.js',
  './js/views/DashboardView.js',
  './js/views/StudentsView.js',
  './js/views/ScannerView.js',
  './js/views/LogsView.js',
  './js/views/PGPView.js',
  './js/views/TGPView.js',
  './js/views/ReportsView.js',
  './js/views/SettingsView.js',
  './js/views/UsersView.js',

  './manifest.json'
];

const cdnUrls = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
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
