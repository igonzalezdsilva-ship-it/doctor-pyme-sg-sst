// =============================================================================
// SERVICE WORKER: DOCTOR PYME SG-SST - PORTAL APP TRABAJADOR
// Cache-First para estáticos, Network-First para APIs y soporte Offline en campo
// =============================================================================

const CACHE_NAME = 'doctor-pyme-v2.4';

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

// Instalación: Precargar shell de la aplicación y omitir espera
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW v2.1] Precargando shell de la aplicación móvil...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW v2.1] Precarga parcial:', err);
      });
    })
  );
});

// Activación: Limpieza total de versiones obsoletas y tomar control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v2.1] Purgando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptor HTTP: Network-First (Garantiza ver actualizaciones de inmediato si hay internet)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Peticiones API: Network-First con fallback a offline
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') {
    event.respondWith(
      fetch(req).catch(() => {
        if (req.method === 'GET') {
          return caches.match(req);
        }
        return new Response(JSON.stringify({ 
          offline: true, 
          error: 'Sin conexión a internet. Tus registros se sincronizarán al recuperar señal.' 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 2. Recursos de la aplicación (HTML, JS, CSS, assets): Network-First
  // Consulta primero al servidor para obtener la última versión; si no hay red, sirve de caché
  event.respondWith(
    fetch(req).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(req);
    })
  );
});
