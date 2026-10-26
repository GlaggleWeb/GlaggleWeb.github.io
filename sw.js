const CACHE = 'glaggle-shared';
const IMG_CACHE = 'glaggle-images';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.hostname === 'res.cloudinary.com' && url.pathname.startsWith('/dcvdvvbnj/')) {
    e.respondWith((async () => {
        const cache = await caches.open(IMG_CACHE);
        const hit = await cache.match(req.url, { ignoreVary: true });
        if (hit) return hit;

        // CORS-Request, damit die Antwort nicht "opaque" ist
        const res = await fetch(new Request(req, { mode: 'cors', credentials: 'omit' }));
        if (res.ok) cache.put(req.url, res.clone());
        return res;
    })());
    return;
}
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
