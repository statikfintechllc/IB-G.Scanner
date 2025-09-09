// Service Worker for SFTi Stock Scanner PWA
// Enables offline functionality and app-like behavior

const CACHE_NAME = 'sfti-scanner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Note: Vite builds assets with hashed names, so we'll cache them dynamically
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache during install:', error);
      })
  );
  // Take control immediately
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        // For IBKR API calls, always try network first
        if (event.request.url.includes('interactivebrokers.com')) {
          console.log('IBKR API call, using network:', event.request.url);
          return fetch(event.request);
        }
        
        // For app assets, try network first then cache
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache successful responses for JS, CSS, and image files
            if (event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  console.log('Caching new asset:', event.request.url);
                  cache.put(event.request, responseToCache);
                });
            }
            
            return response;
          })
          .catch((error) => {
            console.log('Network request failed, serving from cache if available:', event.request.url);
            // If network fails, try to serve a cached version
            return caches.match(event.request);
          });
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});
