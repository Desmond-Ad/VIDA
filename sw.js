// Service Worker for VIDA PWA
const CACHE_NAME = 'vida-cache-v1';
const urlsToCache = [
  '/',
  '/Public/login.html',
  '/Public/Purchase.html',
  '/Public/rev.html',
  '/Public/Dashboard.html',
  '/Public/setup.html',
  '/js/auth.js',
  '/js/config.js',
  '/js/purchase.js',
  '/js/rev.js',
  '/js/Dashboard.js',
  '/cs/style.css',
  '/cs/purchase.css',
  '/cs/rev.css',
  '/cs/Dashboard.css',
  '/cs/company style.css',
  '/cs/thanks.css',
  '/images/DIVA.png',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened, adding essential files');
        // Try to cache each file; skip those that fail
        return Promise.all(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn('Failed to cache', url, err);
              // Don't fail the install if individual files can't be cached
              return Promise.resolve();
            })
          )
        );
      })
      .catch(err => console.log('Cache open failed:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API calls, use network-first (update cache in background)
  if (event.request.url.includes('/orders') || event.request.url.includes('/login') || event.request.url.includes('/register') || event.request.url.includes('/validate-token') || event.request.url.includes('/setup-admin')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache in background
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, use cache-first (but check network for updates)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // Offline fallback
            return new Response('Offline - resource not cached', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});
