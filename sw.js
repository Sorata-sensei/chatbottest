const CACHE_NAME = "paylater-v1";
const OFFLINE_URL = "/offline.html";

const urlsToCache = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.json",
    "/app.js",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// Install Event - Cache resources
self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                await cache.addAll(urlsToCache);
                await self.skipWaiting();
            } catch (error) {
                console.error("Cache installation failed:", error);
            }
        })()
    );
});

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
            await self.clients.claim();
        })()
    );
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
    const { request } = event;
    
    // Only handle GET requests
    if (request.method !== "GET" || !request.url.startsWith("http")) {
        return;
    }

    // Handle navigation requests (HTML pages)
    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    // Try network first
                    const networkResponse = await fetch(request);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    // Fallback to cache
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Fallback to offline page
                    return caches.match(OFFLINE_URL);
                }
            })()
        );
        return;
    }

    // Handle other requests (CSS, JS, images, etc.)
    event.respondWith(
        (async () => {
            // Try cache first
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                // Fallback to network
                const networkResponse = await fetch(request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            } catch (error) {
                // For failed requests, return offline page if available
                return caches.match(OFFLINE_URL);
            }
        })()
    );
});