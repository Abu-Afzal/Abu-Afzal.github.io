// sw.js - Service Worker untuk SIPELITA PWA
// ✅ UPDATE: Versi cache dinaikkan untuk memaksa refresh
const CACHE_VERSION = 'v2.0';
const CACHE_NAME = `sipelita-cache-${CACHE_VERSION}`;

// Daftar aset penting yang perlu di-cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pages/supervisi.html',
  './pages/jadwal.html',
  './pages/sipena.html',
  './pages/jurnal.html',  // ✅ TAMBAHKAN INI
  './css/home-style.css',
  './css/supervisi.css',
  './js/home-auth.js',
  './js/berita.js',
  './js/load-galeri.js',
  './js/jurnal.js',       // ✅ TAMBAHKAN INI
  './assets/images/sipelita-app.png',
  './assets/images/icon-app.png'
];

// ══════════════════════════════════════════════
// INSTALL: Cache aset penting
// ══════════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ [SW] Cache dibuka:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => console.log('⚠️ [SW] Cache gagal:', err))
  );
  self.skipWaiting(); // Aktifkan SW baru segera
});

// ══════════════════════════════════════════════
// ACTIVATE: Hapus cache lama
// ══════════════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ [SW] Hapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Ambil alih semua tab yang terbuka
});

// ══════════════════════════════════════════════
// FETCH: Strategi STALE-WHILE-REVALIDATE
// ══════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip request ke Firebase/Google (selalu ambil dari network)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('firebasestorage')) {
    return;
  }
  
  // ✅ STRATEGI: Network-First untuk HTML & JS (file yang sering berubah)
  if (event.request.destination === 'document' || 
      event.request.url.endsWith('.js') ||
      event.request.url.endsWith('.html')) {
    
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Update cache dengan response baru
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback ke cache jika offline
          return caches.match(event.request).then(cachedResponse => {
            return cachedResponse || caches.match('./index.html');
          });
        })
    );
    return;
  }
  
  // ✅ STRATEGI: Stale-While-Revalidate untuk CSS & gambar
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Kembalikan cache dulu (cepat)
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update cache di background
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      
      // Kembalikan cache jika ada, tunggu network jika tidak
      return cachedResponse || fetchPromise;
    })
  );
});
