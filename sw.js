const CACHE = 'glaggle-shared';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const cacheable = url.origin === location.origin &&
        (url.pathname.startsWith('/shared/') || url.pathname === '/account/glaggle-avatar.js') &&
        !url.pathname.endsWith('version.json');
    if (!cacheable) return;

    e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;                       // sofort, ohne Netzwerk

        const res = await fetch(req);
        if (res.ok) {
            // alte Versionen derselben Datei entfernen
            const keys = await cache.keys();
            await Promise.all(keys
                .filter(k => new URL(k.url).pathname === url.pathname)
                .map(k => cache.delete(k)));
            cache.put(req, res.clone());
        }
        return res;
    })());
});
