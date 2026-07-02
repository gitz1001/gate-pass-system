const CACHE_NAME = 'pgp-cache-v4';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/main.js',
  './js/icons.js',
  './js/models/AppModel.js',
  './js/views/AppView.js',
  './js/views/DashboardView.js',
  './js/views/LogsView.js',
  './js/views/PGPView.js',
  './js/views/ReportsView.js',
  './js/views/ScannerView.js',
  './js/views/SettingsView.js',
  './js/views/StudentsView.js',
  './js/views/TGPView.js',
  './js/views/UsersView.js',
  './js/views/LoginView.js',
  './js/controllers/AppController.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network First strategy for development
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache if network is successful
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
