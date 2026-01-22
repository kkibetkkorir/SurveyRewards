const CACHE_NAME = "SurveyRewards-cache-v1";
const STATIC_CACHE_NAME = "SurveyRewards-static-v1";

// Only cache essential files that definitely exist
const STATIC_URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
];

// Don't cache API requests, Firebase data, or payment endpoints
const NO_CACHE_URLS = [
  /\/api\//,
  /firebaseio\.com/,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /\.hot-update\./,
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        // Try to cache, but don't fail if some URLs don't exist
        return Promise.all(
          STATIC_URLS_TO_CACHE.map((url) => {
            return cache.add(url).catch((err) => {
              console.log(`Failed to cache ${url}:`, err);
              return Promise.resolve();
            });
          }),
        );
      }),
      self.skipWaiting(),
    ]),
  );
  console.log("Service Worker installed");
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      self.clients.claim(),
    ]),
  );
  console.log("Service Worker activated");
});

// Simplified fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and no-cache URLs
  if (
    request.method !== "GET" ||
    NO_CACHE_URLS.some((regex) => regex.test(url.href))
  ) {
    return;
  }

  // Cache first for static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request)
            .then((response) => {
              if (response.ok) {
                return caches.open(STATIC_CACHE_NAME).then((cache) => {
                  return cache.put(request, response);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return response;
          })
          .catch(() => {
            // If network fails and we're at root, serve index.html
            if (request.url === self.location.origin + "/") {
              return caches.match("/index.html");
            }
            return new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            });
          });
      }),
    );
  }
});
