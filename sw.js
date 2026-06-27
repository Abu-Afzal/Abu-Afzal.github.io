// sw.js - Service Worker untuk SIPELITA PWA
const CACHE_NAME = 'sipelita-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pages/supervisi.html',
  './pages/jadwal.html',
  './pages/sipena.html',
  './css/home-style.css',
  './css/supervisi.css',
  './js/home-auth.js',
  './js/berita.js',
  './js/load-galeri.js',
  './assets/images/sipelita-app.png',
  './assets/images/icon-app.png'
];

// Install: Cache semua aset penting
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache berhasil dibuka');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.log('⚠️ Cache gagal:', err))
  );
  self.skipWaiting();
});

// Activate: Hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Hapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Coba cache dulu, baru network
self.addEventListener('fetch', event => {
  // Skip untuk request ke Firebase/Google
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, kembalikan
        if (response) {
          return response;
        }
        
        // Jika tidak ada, fetch dari network
        return fetch(event.request).then(response => {
          // Jika response valid, simpan ke cache
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Jika offline dan tidak ada di cache, tampilkan fallback
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
