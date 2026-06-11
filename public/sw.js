const CACHE_NAME = 'rival-fit-v3';
const OFFLINE_URL = '/offline.html';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.svg', OFFLINE_URL];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(keys =>
                Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
            )
        ])
    );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', function (event) {
    if (!event.data) return;

    let data = {};
    try { data = event.data.json(); } catch { return; }

    const { title = 'Rival Fit', body = '', url = '/', type = 'default' } = data;

    // Icon and badge by notification type
    const iconMap = {
        message:   '/icons/msg.png',
        like:      '/icons/like.png',
        comment:   '/icons/comment.png',
        follow:    '/icons/follow.png',
        duel:      '/icons/duel.png',
        default:   '/logo.svg',
    };
    const icon  = iconMap[type] || iconMap.default;
    const badge = '/logo.svg';

    // Vibration patterns by type
    const vibrateMap = {
        message: [200, 100, 200, 100, 200],
        like:    [100, 50, 100],
        comment: [150, 100, 150],
        follow:  [200, 100, 100],
        duel:    [300, 100, 300],
        default: [200, 100, 200],
    };
    const vibrate = vibrateMap[type] || vibrateMap.default;

    const options = {
        body,
        icon,
        badge,
        vibrate,
        tag:             `rival-${type}`,   // groups same-type notifications
        renotify:        true,              // vibrates even on same tag
        requireInteraction: type === 'message' || type === 'duel', // stays until tapped
        silent:          false,
        data: { url, type, dateOfArrival: Date.now() },
        actions: type === 'message'
            ? [{ action: 'reply', title: '💬 Responder' }, { action: 'close', title: 'Cerrar' }]
            : [{ action: 'open', title: '👁 Ver' }, { action: 'close', title: 'Cerrar' }],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Try to focus existing window at that URL
            const match = windowClients.find(c => c.url === urlToOpen && 'focus' in c);
            if (match) return match.focus();
            // Focus any open window and navigate
            const any = windowClients.find(c => 'focus' in c);
            if (any) return any.focus().then(c => c.navigate ? c.navigate(urlToOpen) : null);
            // Open new window
            return clients.openWindow(urlToOpen);
        })
    );
});

// ── Fetch: network-first for pages, cache-first for assets ───────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, cross-origin, and API/supabase requests
    if (request.method !== 'GET') return;
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

    const isAsset = /\.(svg|png|jpg|jpeg|ico|webp|avif|woff|woff2|css)(\?.*)?$/.test(url.pathname);

    if (isAsset) {
        // Cache-first for static assets
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return res;
            }))
        );
        return;
    }

    // Navigation requests: network-first, branded offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() =>
                caches.match(OFFLINE_URL).then(cached => cached || Response.error())
            )
        );
    }
    // Let everything else go to network normally
});
