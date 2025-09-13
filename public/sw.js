// Service Worker for SFTi Stock Scanner PWA// Service Worker for SFTi Stock Scanner PWA// Service Worker for SFTi Stock Scanner PWA

// Optimized for iPhone offline functionality

// Complete offline functionality for iPhone and other devices// Complete offline functionality for iPhone and other devices

const CACHE_NAME = 'sfti-scanner-v4.0';



// Files to cache for offline use (will be updated by build script)

const STATIC_FILES = [const CACHE_NAME = 'sfti-scanner-v3.0';const CACHE_NAME = 'sfti-scanner-v3.0';

  '/',

  '/index.html',const RUNTIME_CACHE = 'sfti-runtime-v3.0';

  '/manifest.json'

];// Core files that must be cached for offline functionality



// Install service worker and cache filesconst STATIC_FILES = [// Core files that must be cached for offline functionality

self.addEventListener('install', (event) => {

  console.log('🔧 SFTi SW v4.0 installing...');  '/',const STATIC_FILES = [

  

  event.waitUntil(  '/index.html',  '/',

    caches.open(CACHE_NAME)

      .then((cache) => {  '/manifest.json',  '/index.html',

        console.log('📦 Caching files for offline...');

        return cache.addAll(STATIC_FILES);  // Assets will be injected here by build script  '/manifest.json',

      })

      .then(() => {];  // Assets will be injected here by build script

        console.log('✅ Files cached successfully');

        return self.skipWaiting();];

      })

      .catch((err) => {// Install event - cache all essential files

        console.error('❌ Cache failed:', err);

      })self.addEventListener('install', (event) => {// Install event - cache all essential files

  );

});  console.log('🔧 SFTi Service Worker v3.0 installing...');self.addEventListener('install', (event) => {



// Activate service worker and clean old caches    console.log('🔧 SFTi Service Worker v3.0 installing...');

self.addEventListener('activate', (event) => {

  console.log('🚀 SFTi SW v4.0 activating...');  event.waitUntil(  

  

  event.waitUntil(    caches.open(CACHE_NAME)  event.waitUntil(

    caches.keys()

      .then((cacheNames) => {      .then((cache) => {    caches.open(CACHE_NAME)

        return Promise.all(

          cacheNames        console.log('📦 Caching essential files for offline use...');      .then((cache) => {

            .filter((name) => name !== CACHE_NAME)

            .map((name) => {        return cache.addAll(STATIC_FILES);        console.log('📦 Caching essential files for offline use...');

              console.log('🗑️ Deleting old cache:', name);

              return caches.delete(name);      })        return cache.addAll(STATIC_FILES);

            })

        );      .then(() => {      })

      })

      .then(() => {        console.log('✅ All files cached successfully');      .then(() => {

        console.log('✅ SW activated');

        return self.clients.claim();        // Force this service worker to become active immediately        console.log('✅ All files cached successfully');

      })

  );        return self.skipWaiting();        // Force this service worker to become active immediately

});

      })        return self.skipWaiting();

// Handle all requests

self.addEventListener('fetch', (event) => {      .catch((err) => {      })

  const request = event.request;

  const url = new URL(request.url);        console.error('❌ Failed to cache files:', err);      .catch((error) => {

  

  // Only handle GET requests from same origin      })        console.error('❌ Failed to cache files:', error);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {

    return;  );      })

  }

  });  );

  event.respondWith(handleRequest(request));

});});



// Main request handler// Activate event - clean up old caches and take control

async function handleRequest(request) {

  const url = new URL(request.url);self.addEventListener('activate', (event) => {// Activate event - clean up old caches and take control

  

  try {  console.log('🚀 SFTi Service Worker v3.0 activating...');self.addEventListener('activate', (event) => {

    // For navigation (opening the app), always serve index.html

    if (request.mode === 'navigate') {    console.log('🚀 SFTi Service Worker v3.0 activating...');

      const cache = await caches.open(CACHE_NAME);

      const cachedIndex = await cache.match('/index.html');  event.waitUntil(  

      

      if (cachedIndex) {    caches.keys()  event.waitUntil(

        console.log('📱 Serving cached app');

        return cachedIndex;      .then((cacheNames) => {    caches.keys()

      }

    }        return Promise.all(      .then((cacheNames) => {

    

    // For assets, try cache first          cacheNames        return Promise.all(

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {            .filter((cacheName) => {          cacheNames

      console.log('💾 Serving cached:', url.pathname);

      return cachedResponse;              // Delete old caches that don't match current version            .filter((cacheName) => {

    }

                  return cacheName !== CACHE_NAME;              // Delete old caches that don't match current version

    // Try network and cache the response

    const networkResponse = await fetch(request);            })              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;

    

    if (networkResponse.ok) {            .map((cacheName) => {            })

      const cache = await caches.open(CACHE_NAME);

      cache.put(request, networkResponse.clone());              console.log('🗑️ Deleting old cache:', cacheName);            .map((cacheName) => {

      console.log('📥 Cached:', url.pathname);

    }              return caches.delete(cacheName);              console.log('🗑️ Deleting old cache:', cacheName);

    

    return networkResponse;            })              return caches.delete(cacheName);

    

  } catch (error) {        );            })

    console.log('⚠️ Request failed:', url.pathname);

          })        );

    // For navigation, return offline page

    if (request.mode === 'navigate') {      .then(() => {      })

      return createOfflinePage();

    }        console.log('✅ Service Worker activated and took control');      .then(() => {

    

    // For assets, return cached version if available        // Take control of all pages immediately (important for PWA)        console.log('✅ Service Worker activated and took control');

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {        return self.clients.claim();        // Take control of all pages immediately (important for PWA)

      return cachedResponse;

    }      })        return self.clients.claim();

    

    throw error;  );      })

  }

}});  );



// Create offline page});

function createOfflinePage() {

  const html = `// Fetch event - comprehensive offline-first strategy

<!DOCTYPE html>

<html lang="en">self.addEventListener('fetch', (event) => {// Fetch event - comprehensive offline-first strategy

<head>

    <meta charset="UTF-8">  const request = event.request;self.addEventListener('fetch', (event) => {

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>SFTi Scanner - Offline</title>  const url = new URL(request.url);  const request = event.request;

    <style>

        body {    const url = new URL(request.url);

            font-family: -apple-system, BlinkMacSystemFont, sans-serif;

            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);  // Only handle GET requests  

            color: white;

            margin: 0;  if (request.method !== 'GET') {  // Only handle GET requests

            min-height: 100vh;

            display: flex;    return;  if (request.method !== 'GET') {

            align-items: center;

            justify-content: center;  }    return;

            text-align: center;

        }    }

        .container {

            max-width: 350px;  // Skip chrome-extension and other non-http requests  

            padding: 30px;

        }  if (!url.protocol.startsWith('http')) {  // Skip chrome-extension and other non-http requests

        .icon {

            font-size: 48px;    return;  if (!url.protocol.startsWith('http')) {

            margin-bottom: 20px;

        }  }    return;

        h1 {

            color: #10b981;  }

            margin-bottom: 15px;

        }  // Handle different types of requests

        p {

            opacity: 0.8;  if (isAppNavigation(request)) {  // Handle different types of requests

            margin-bottom: 25px;

        }    // Navigation requests (opening the app)  if (isAppNavigation(request)) {

        .btn {

            background: #10b981;    event.respondWith(handleNavigation(request));    // Navigation requests (opening the app)

            color: white;

            border: none;  } else if (isAppAsset(url)) {    event.respondWith(handleNavigation(request));

            padding: 12px 24px;

            border-radius: 8px;    // App assets (JS, CSS, images)  } else if (isAppAsset(url)) {

            font-size: 16px;

            cursor: pointer;    event.respondWith(handleAsset(request));    // App assets (JS, CSS, images)

        }

        .btn:hover {  } else if (isExternalRequest(url)) {    event.respondWith(handleAsset(request));

            background: #059669;

        }    // External requests (fonts, APIs)  } else if (isExternalRequest(url)) {

    </style>

</head>    event.respondWith(handleExternal(request));    // External requests (fonts, APIs)

<body>

    <div class="container">  }    event.respondWith(handleExternal(request));

        <div class="icon">📱</div>

        <h1>SFTi Scanner</h1>});  }

        <p>You're offline. The app will reload when you're back online.</p>

        <button class="btn" onclick="window.location.reload()">});

            Try Again

        </button>// Check if request is app navigation

    </div>

    <script>function isAppNavigation(request) {// Check if request is app navigation

        window.addEventListener('online', () => {

            window.location.reload();  return request.mode === 'navigate' || function isAppNavigation(request) {

        });

    </script>         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));  return request.mode === 'navigate' || 

</body>

</html>`;}         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));



  return new Response(html, {}

    headers: { 'Content-Type': 'text/html' }

  });// Check if URL is an app asset

}

function isAppAsset(url) {// Check if URL is an app asset

console.log('🎯 SFTi Service Worker v4.0 ready');
  const pathname = url.pathname;function isAppAsset(url) {

  return pathname.startsWith('/assets/') ||   const pathname = url.pathname;

         pathname === '/manifest.json' ||  return pathname.startsWith('/assets/') || 

         pathname === '/favicon.ico' ||         pathname === '/manifest.json' ||

         pathname.endsWith('.js') ||         pathname === '/favicon.ico' ||

         pathname.endsWith('.css') ||         pathname.endsWith('.js') ||

         pathname.endsWith('.png') ||         pathname.endsWith('.css') ||

         pathname.endsWith('.svg') ||         pathname.endsWith('.png') ||

         pathname.endsWith('.jpg') ||         pathname.endsWith('.svg') ||

         pathname.endsWith('.jpeg');         pathname.endsWith('.jpg') ||

}         pathname.endsWith('.jpeg');

}

// Check if request is external (different origin)

function isExternalRequest(url) {// Check if request is external (different origin)

  return url.origin !== self.location.origin;function isExternalRequest(url) {

}  return url.origin !== self.location.origin;

}

// Handle navigation requests (app pages)

async function handleNavigation(request) {// Handle navigation requests (app pages)

  console.log('🧭 Navigation request:', request.url);async function handleNavigation(request) {

    console.log('🧭 Navigation request:', request.url);

  try {  

    // Always serve cached index.html for navigation in offline PWA  try {

    const cache = await caches.open(CACHE_NAME);    // Always serve cached index.html for navigation in offline PWA

    const cachedResponse = await cache.match('/index.html');    const cache = await caches.open(CACHE_NAME);

        const cachedResponse = await cache.match('/index.html');

    if (cachedResponse) {    

      console.log('📱 Serving cached app for navigation');    if (cachedResponse) {

      return cachedResponse;      console.log('📱 Serving cached app for navigation');

    }      return cachedResponse;

        }

    // Fallback: try network if cache fails    

    const networkResponse = await fetch(request);    // Fallback: try network if cache fails

        const networkResponse = await fetch(request);

    // Cache the response for future use    

    if (networkResponse.ok) {    // Cache the response for future use

      cache.put('/index.html', networkResponse.clone());    if (networkResponse.ok) {

    }      cache.put('/index.html', networkResponse.clone());

        }

    return networkResponse;    

        return networkResponse;

  } catch {    

    console.log('⚠️ Navigation failed, serving offline fallback');  } catch (error) {

    return createOfflineResponse();    console.log('⚠️ Navigation failed, serving offline fallback');

  }    return createOfflineResponse();

}  }

}

// Handle asset requests (JS, CSS, images)

async function handleAsset(request) {// Handle asset requests (JS, CSS, images)

  const url = new URL(request.url);async function handleAsset(request) {

  console.log('🎨 Asset request:', url.pathname);  const url = new URL(request.url);

    console.log('🎨 Asset request:', url.pathname);

  try {  

    // Check cache first (offline-first for assets)  try {

    const cachedResponse = await caches.match(request);    // Check cache first (offline-first for assets)

    if (cachedResponse) {    const cachedResponse = await caches.match(request);

      console.log('💾 Serving cached asset:', url.pathname);    if (cachedResponse) {

      return cachedResponse;      console.log('💾 Serving cached asset:', url.pathname);

    }      return cachedResponse;

        }

    // If not cached, try network and cache the result    

    const networkResponse = await fetch(request);    // If not cached, try network and cache the result

        const networkResponse = await fetch(request);

    if (networkResponse.ok) {    

      // Cache for future use    if (networkResponse.ok) {

      const cache = await caches.open(CACHE_NAME);      // Cache in runtime cache for future use

      cache.put(request, networkResponse.clone());      const cache = await caches.open(RUNTIME_CACHE);

      console.log('📥 Cached new asset:', url.pathname);      cache.put(request, networkResponse.clone());

    }      console.log('📥 Cached new asset:', url.pathname);

        }

    return networkResponse;    

        return networkResponse;

  } catch {    

    console.log('❌ Asset request failed:', url.pathname);  } catch (error) {

        console.log('❌ Asset request failed:', url.pathname, error);

    // For critical assets, return a placeholder    

    if (url.pathname.endsWith('.js')) {    // For critical assets, return a placeholder

      return new Response('console.log("Offline: JS file not available");', {    if (url.pathname.endsWith('.js')) {

        headers: { 'Content-Type': 'application/javascript' }      return new Response('console.log("Offline: JS file not available");', {

      });        headers: { 'Content-Type': 'application/javascript' }

    } else if (url.pathname.endsWith('.css')) {      });

      return new Response('/* Offline: CSS file not available */', {    } else if (url.pathname.endsWith('.css')) {

        headers: { 'Content-Type': 'text/css' }      return new Response('/* Offline: CSS file not available */', {

      });        headers: { 'Content-Type': 'text/css' }

    }      });

        }

    throw new Error('Asset not available offline');    

  }    throw error;

}  }

}

// Handle external requests (fonts, APIs)

async function handleExternal(request) {// Handle external requests (fonts, APIs)

  try {async function handleExternal(request) {

    // Try network first for external requests  try {

    return await fetch(request);    // Try network first for external requests

  } catch {    return await fetch(request);

    // Check if we have it cached  } catch (error) {

    const cachedResponse = await caches.match(request);    // Check if we have it cached

    if (cachedResponse) {    const cachedResponse = await caches.match(request);

      return cachedResponse;    if (cachedResponse) {

    }      return cachedResponse;

        }

    // No fallback for external requests    

    throw new Error('External resource not available offline');    // No fallback for external requests

  }    throw error;

}  }

}

// Create offline response when everything fails

function createOfflineResponse() {// Create offline response when everything fails

  const offlineHTML = `function createOfflineResponse() {

<!DOCTYPE html>  const offlineHTML = `

<html lang="en"><!DOCTYPE html>

<head><html lang="en">

    <meta charset="UTF-8"><head>

    <meta name="viewport" content="width=device-width, initial-scale=1.0">    <meta charset="UTF-8">

    <title>SFTi Scanner - Offline</title>    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>    <title>SFTi Scanner - Offline</title>

        body {    <style>

            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;        body {

            margin: 0;            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

            padding: 0;            margin: 0;

            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);            padding: 0;

            color: white;            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

            min-height: 100vh;            color: white;

            display: flex;            min-height: 100vh;

            align-items: center;            display: flex;

            justify-content: center;            align-items: center;

        }            justify-content: center;

        .container {        }

            text-align: center;        .container {

            max-width: 400px;            text-align: center;

            padding: 40px 20px;            max-width: 400px;

        }            padding: 40px 20px;

        .icon {        }

            font-size: 64px;        .icon {

            margin-bottom: 20px;            font-size: 64px;

        }            margin-bottom: 20px;

        h1 {        }

            color: #10b981;        h1 {

            margin-bottom: 16px;            color: #10b981;

            font-size: 24px;            margin-bottom: 16px;

        }            font-size: 24px;

        p {        }

            margin-bottom: 24px;        p {

            opacity: 0.8;            margin-bottom: 24px;

            line-height: 1.5;            opacity: 0.8;

        }            line-height: 1.5;

        .retry-btn {        }

            background: #10b981;        .retry-btn {

            color: white;            background: #10b981;

            border: none;            color: white;

            padding: 12px 24px;            border: none;

            border-radius: 8px;            padding: 12px 24px;

            font-size: 16px;            border-radius: 8px;

            cursor: pointer;            font-size: 16px;

            transition: background 0.2s;            cursor: pointer;

        }            transition: background 0.2s;

        .retry-btn:hover {        }

            background: #059669;        .retry-btn:hover {

        }            background: #059669;

        .status {        }

            margin-top: 20px;        .status {

            font-size: 14px;            margin-top: 20px;

            opacity: 0.6;            font-size: 14px;

        }            opacity: 0.6;

    </style>        }

</head>    </style>

<body></head>

    <div class="container"><body>

        <div class="icon">📱</div>    <div class="container">

        <h1>SFTi Stock Scanner</h1>        <div class="icon">📱</div>

        <p>You're currently offline. The app is loading cached content...</p>        <h1>SFTi Stock Scanner</h1>

        <button class="retry-btn" onclick="window.location.reload()">        <p>You're currently offline. The app is loading cached content...</p>

            Reload App        <button class="retry-btn" onclick="window.location.reload()">

        </button>            Reload App

        <div class="status">PWA Offline Mode</div>        </button>

    </div>        <div class="status">PWA Offline Mode</div>

    <script>    </div>

        // Auto-retry when online    <script>

        window.addEventListener('online', () => {        // Auto-retry when online

            console.log('Back online, reloading...');        window.addEventListener('online', () => {

            window.location.reload();            console.log('Back online, reloading...');

        });            window.location.reload();

    </script>        });

</body>    </script>

</html>`;</body>

</html>`;

  return new Response(offlineHTML, {

    headers: { 'Content-Type': 'text/html' }  return new Response(offlineHTML, {

  });    headers: { 'Content-Type': 'text/html' }

}  });

}

// Debug logging

self.addEventListener('message', (event) => {// Debug logging

  if (event.data && event.data.type === 'GET_CACHE_INFO') {self.addEventListener('message', (event) => {

    caches.open(CACHE_NAME).then((cache) => {  if (event.data && event.data.type === 'GET_CACHE_INFO') {

      cache.keys().then((keys) => {    caches.open(CACHE_NAME).then((cache) => {

        console.log('📋 Cached files:', keys.map(k => k.url));      cache.keys().then((keys) => {

        event.ports[0].postMessage({        console.log('📋 Cached files:', keys.map(k => k.url));

          type: 'CACHE_INFO',        event.ports[0].postMessage({

          files: keys.map(k => k.url)          type: 'CACHE_INFO',

        });          files: keys.map(k => k.url)

      });        });

    });      });

  }    });

});  }

});

console.log('🎯 SFTi Service Worker v3.0 loaded and ready');
console.log('🎯 SFTi Service Worker v3.0 loaded and ready');

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('SFTi Service Worker v2.0 activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete old caches
      const deletePromises = cacheNames
        .filter(cacheName => 
          cacheName !== STATIC_CACHE_NAME && 
          cacheName !== API_CACHE_NAME &&
          cacheName !== CACHE_NAME
        )
        .map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        });
      
      return Promise.all(deletePromises);
    }).then(() => {
      console.log('Service Worker activation completed');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement comprehensive caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.hostname === self.location.hostname) {
    // Same-origin requests (our app)
    event.respondWith(handleAppRequest(event.request));
  } else if (url.hostname.includes('interactivebrokers.com') || 
             url.hostname.includes('localhost') && url.port === '5000') {
    // IBKR API requests - always try network first
    event.respondWith(handleIBKRRequest(event.request));
  } else if (url.hostname.includes('fonts.googleapis.com') || 
             url.hostname.includes('fonts.gstatic.com')) {
    // Font requests - cache with long TTL
    event.respondWith(handleFontRequest(event.request));
  } else {
    // External requests - network first with fallback
    event.respondWith(handleExternalRequest(event.request));
  }
});

// Handle app requests (HTML, JS, CSS, images)
async function handleAppRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For navigation requests (HTML pages)
    if (request.mode === 'navigate') {
      // Try network first for navigation
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          // Cache successful navigation responses
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
      } catch (error) {
        console.log('Network failed for navigation, serving from cache');
      }
      
      // Fallback to cached index.html for any navigation request
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match('/index.html') || await cache.match('/');
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Last resort - return a basic offline page
      return new Response(createOfflineFallback(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // For asset requests (JS, CSS, images)
    if (isDynamicAsset(url.pathname)) {
      // Check cache first for assets
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('Serving asset from cache:', url.pathname);
        return cachedResponse;
      }
      
      // If not in cache, fetch and cache
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, networkResponse.clone());
          console.log('Cached new asset:', url.pathname);
          return networkResponse;
        }
      } catch (error) {
        console.log('Failed to fetch asset:', url.pathname);
      }
    }
    
    // Default: try cache first, then network
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return fetch(request);
    
  } catch (error) {
    console.error('Error handling app request:', error);
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return new Response(createOfflineFallback(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Handle IBKR API requests - always try network, never cache
async function handleIBKRRequest(request) {
  try {
    console.log('IBKR API request:', request.url);
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('IBKR API request failed:', error.message);
    // Return a mock response indicating offline mode
    return new Response(JSON.stringify({
      error: 'offline_mode',
      message: 'IBKR API unavailable - running in offline mode'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle font requests - cache aggressively
async function handleFontRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Font request failed:', error);
    throw error;
  }
}

// Handle external requests - network first with cache fallback
async function handleExternalRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Check if URL matches dynamic asset patterns
function isDynamicAsset(pathname) {
  return DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Create offline fallback HTML
function createOfflineFallback() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SFTi Stock Scanner - Offline</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 40px 20px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #10b981;
            margin-bottom: 10px;
        }
        .retry-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        .retry-btn:hover {
            background: #059669;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📱</div>
        <h1>SFTi Scanner</h1>
        <p>You're currently offline. The app will work normally when you're back online.</p>
        <button class="retry-btn" onclick="window.location.reload()">
            Try Again
        </button>
    </div>
</body>
</html>
  `;
}
