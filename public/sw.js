self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/logo.svg', // Ensure this exists or use absolute URL
            badge: '/logo.svg', // Small icon for notification bar
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url || '/'
            }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            const urlToOpen = event.notification.data.url;

            // Check if there is already a window open
            for (let i = 0; i < windowClients.length; i++) {
                let client = windowClients[i];
                // If so, focus it and navigate
                if ('focus' in client) {
                    return client.navigate(urlToOpen).then(c => c.focus());
                }
            }
            // If not, then open the target URL in a new window/tab.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

const CACHE_NAME = 'rivalfit-static-v1';
const STATIC_ASSETS = ['/', '/favicon.ico', '/manifest.json', '/logo.svg'];

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only cache same-origin GET requests for static assets
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // Network-first for API routes
    if (url.pathname.startsWith('/api/')) return;

    // Stale-while-revalidate for static assets
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname.match(/\.(svg|png|jpg|ico|webp|avif|woff2?)$/)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(request).then(cached => {
                    const networkFetch = fetch(request).then(response => {
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    });
                    return cached || networkFetch;
                })
            )
        );
    }
});
