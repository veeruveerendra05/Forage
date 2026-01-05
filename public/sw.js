/**
 * Service Worker for Progressive Web App
 * 
 * Features:
 * - Offline support
 * - Cache management
 * - Background sync
 * - Push notifications
 */

const CACHE_NAME = 'goalforge-v1.0.0';
const RUNTIME_CACHE = 'goalforge-runtime';

// Assets to cache on install
const PRECACHE_URLS = [
    '/',
    '/pages/dashboard.html',
    '/pages/habits.html',
    '/pages/goals.html',
    '/pages/social.html',
    '/pages/challenges.html',
    '/pages/leaderboard.html',
    '/pages/domains.html',
    '/pages/activity.html',
    '/pages/profile.html',
    '/css/design-system.css',
    '/css/components.css',
    '/js/dashboard.js',
    '/js/habits.js',
    '/js/social.js',
    '/js/challenges.js',
    '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // API requests - network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful GET requests
                    if (request.method === 'GET' && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if available
                    return caches.match(request);
                })
        );
        return;
    }

    // Static assets - cache first, network fallback
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request).then((response) => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Background Sync - retry failed requests
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-habits') {
        event.waitUntil(syncHabits());
    }
});

async function syncHabits() {
    try {
        const cache = await caches.open('pending-requests');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                await fetch(request);
                await cache.delete(request);
                console.log('[SW] Synced:', request.url);
            } catch (error) {
                console.error('[SW] Sync failed:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Background sync error:', error);
    }
}

// Push Notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'GoalForge';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data)
        );
    }
});

// Message handler (for communication with main thread)
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(RUNTIME_CACHE).then((cache) => {
                return cache.addAll(event.data.urls);
            })
        );
    }
});
