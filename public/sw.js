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
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
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

self.addEventListener('fetch', (event) => {
    // Pass-through strategy - do not cache anything yet to avoid issues
    // But strictly required for PWA installability criteria
});
