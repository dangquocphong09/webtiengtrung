const CACHE_NAME = 'tvtt-v2';
const ASSETS = [
  './',
  './index.html',
  './pages/vocabulary.html',
  './pages/review.html',
  './pages/writing.html',
  './pages/import.html',
  './css/style.css',
  './js/config.js',
  './js/firebase-config.js',
  './js/utils.js',
  './js/api.js',
  './js/reviewService.js',
  './js/review.js',
  './js/writing.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return res;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});
