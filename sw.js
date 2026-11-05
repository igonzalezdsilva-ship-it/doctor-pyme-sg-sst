// =============================================================================
// SERVICE WORKER: DOCTOR PYME SG-SST - PORTAL APP TRABAJADOR
// Cache-First para estáticos, Network-First para APIs y soporte Offline en campo
// =============================================================================

const CACHE_NAME = 'doctor-pyme-worker-v1.0';

const ASSETS_TO_CACHE = [
  './',
  './app.html',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './css/styles.css',
  './favicon.svg',
  './assets/app-icon.png',
  './assets/logo-horizontal.png',
  './assets/favicon.png',
  './js/auth.js',
  './js/store.js',
  './js/db.js',
  './js/components/workerPortal.js',
  './js/components/documentViewer.js',
  './js/components/signatures.js',
  './js/components/training.js',
  './js/services/compressionService.js',
  './js/services/trainingReports.js'
];

// Instalación: Precargar shell de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precargando shell de la aplicación móvil...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Algún recurso no se pudo precargar:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de versiones obsoletas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché previa:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptor de peticiones HTTP
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Peticiones a API del servidor: Network-First
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') {
    event.respondWith(
      fetch(req).catch(() => {
        // Fallback offline para peticiones de lectura API
        if (req.method === 'GET') {
          return caches.match(req);
        }
        return new Response(JSON.stringify({ 
          offline: true, 
          error: 'Sin conexión a internet. Los datos se guardarán localmente para sincronización posterior.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 2. Recursos estáticos locales: Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
