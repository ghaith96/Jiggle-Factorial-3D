// Service Worker for Jiggle Factorial 3D
// Provides offline support and caching

const CACHE_NAME = 'jiggle-factorial-3d-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/hdri.jpg',
  '/js/utils.js',
  '/js/object-pools.js',
  '/js/touch-controls.js',
  // Three.js CDN files (will be cached on first load)
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r170/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/FontLoader.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/TextGeometry.js',
  'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
  // dat.GUI
  'https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.7/dat.gui.min.js',
  // Chart.js
  'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, { mode: 'cors' });
        })).catch((err) => {
          console.warn('[ServiceWorker] Cache addAll failed:', err);
          // Try to cache individually
          return Promise.all(
            urlsToCache.map((url) => 
              cache.add(url).catch((e) => console.warn(`Failed to cache ${url}:`, e))
            )
          );
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.error('[ServiceWorker] Fetch failed:', error);
          
          // Return offline fallback page if available
          return caches.match('/index.html');
        });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach(client => client.postMessage({ action: 'cacheCleared' }));
      })
    );
  }
});

