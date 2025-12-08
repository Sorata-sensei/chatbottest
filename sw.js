const CACHE_NAME = "paylater-v1";
const OFFLINE_URL = "offline.html";

const urlsToCache = [
    "./",
    "index.html",
    "offline.html",
    "manifest.json",
    "app.js",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// Install Event
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

// Activate Event
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

// Fetch Event
self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") return;

    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(request);
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                    return networkResponse;
                } catch (error) {
                    return (await caches.match(request)) || caches.match(OFFLINE_URL);
                }
            })()
        );
        return;
    }

    event.respondWith(
        (async () => {
            const cached = await caches.match(request);
            if (cached) return cached;

            try {
                const networkResponse = await fetch(request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            } catch (error) {
                return caches.match(OFFLINE_URL);
            }
        })()
    );
});
