// Offline support. Only same-origin GET requests for the site's own files are handled.
// Everything else (downloads via workers.dev, mp3quran audio and API, analytics) is never touched.
const VER = 'mem-v50';
const CORE = ['./', './index.html', './1-style.css', './2-app.js', './4-manifest.webmanifest', './5-icon-192.png', './6-icon-512.png',
  './4-Amiri-Regular-DuMToiWY.ttf', './5-Tajawal-Bold-N9U1XsUl.ttf', './6-Tajawal-Medium-xUoGaSp_.ttf', './7-Tajawal-Regular-lomV3N7R.ttf'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (e.data === 'kill') e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.registration.unregister()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (/\.(mp3|m4a|ogg|wav)$/i.test(u.pathname)) return;
  const font = /\.(ttf|woff2?|png|jpg|webp)$/i.test(u.pathname);
  e.respondWith((async () => {
    const c = await caches.open(VER);
    const hit = await c.match(r, { ignoreSearch: true });
    if (font && hit) return hit;
    try {
      const net = await Promise.race([fetch(r), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 6000))]);
      if (net && net.ok) c.put(r, net.clone()).catch(() => {});
      return net;
    } catch (err) {
      if (hit) return hit;
      if (r.mode === 'navigate') { const idx = await c.match('./index.html', { ignoreSearch: true }); if (idx) return idx; }
      return new Response('offline', { status: 503 });
    }
  })());
});
