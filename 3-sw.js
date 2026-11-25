// Offline support. Shell cache (versioned by ?v= in the page), no audio cached unless the user saves it.
const SHELL = 'mem-shell-v1';
const AUDIO = 'mem-audio-v1';
const SCOPE = self.registration.scope;
const absolute = (u, base) => new URL(u, base).href;

async function precache(indexText, indexUrl) {
  const c = await caches.open(SHELL);
  const urls = new Set();
  for (const m of indexText.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = absolute(m[1], indexUrl);
    if (u.startsWith(SCOPE) && !u.endsWith('/') ) urls.add(u);
  }
  const css = [...urls].filter(u => /style\.css/.test(u));
  for (const cu of css) {
    try {
      const r = await fetch(cu, { cache: 'no-cache' });
      if (!r.ok) continue;
      const t = await r.clone().text();
      await c.put(cu, r);
      urls.delete(cu);
      for (const m of t.matchAll(/url\(([^)]+)\)/g)) {
        const f = m[1].replace(/["']/g, '');
        if (f.startsWith('data:')) continue;
        urls.add(absolute(f, cu));
      }
    } catch (e) { /* ignore */ }
  }
  for (const u of urls) {
    if (/\/(3-)?sw\.js/.test(u)) continue;
    try { if (!(await c.match(u))) { const r = await fetch(u); if (r.ok) await c.put(u, r); } } catch (e) { /* ignore */ }
  }
  // drop old versions of the app files
  const cur = new Set([...urls, ...css]);
  for (const k of await c.keys()) {
    if (/(app\.js|style\.css)/.test(k.url) && !cur.has(k.url)) await c.delete(k);
  }
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    try {
      const r = await fetch(SCOPE, { cache: 'no-cache' });
      if (r.ok) { const t = await r.clone().text(); await (await caches.open(SHELL)).put(SCOPE, r); await precache(t, SCOPE); }
    } catch (err) { /* offline install: try again on next visit */ }
  })());
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== SHELL && k !== AUDIO) await caches.delete(k);
  await self.clients.claim();
})()));

async function navigate(e) {
  const c = await caches.open(SHELL);
  try {
    const r = await fetch(e.request, { cache: 'no-cache' });
    if (r.ok) {
      const t = await r.clone().text();
      await c.put(SCOPE, r.clone());
      e.waitUntil(precache(t, SCOPE));
    }
    return r;
  } catch (err) {
    const hit = await c.match(SCOPE);
    if (hit) return hit;
    throw err;
  }
}
async function asset(req) {
  const c = await caches.open(SHELL);
  const hit = await c.match(req.url);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok && r.status === 200) c.put(req.url, r.clone());
  return r;
}
async function audio(req) {
  const c = await caches.open(AUDIO);
  const hit = await c.match(req.url);
  if (!hit) return fetch(req);
  const blob = await hit.blob();
  const size = blob.size;
  const range = req.headers.get('range');
  const type = 'audio/mpeg';
  if (!range) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let s = m && m[1] ? parseInt(m[1], 10) : 0;
  let en = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { s = Math.max(0, size - parseInt(m[2], 10)); en = size - 1; }
  if (s >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  en = Math.min(en, size - 1);
  return new Response(blob.slice(s, en + 1), { status: 206, headers: { 'Content-Type': type, 'Content-Length': String(en - s + 1), 'Content-Range': `bytes ${s}-${en}/${size}`, 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname === 'cdn.mp3quran.net' && u.pathname.endsWith('.mp3')) { e.respondWith(audio(req)); return; }
  if (u.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(navigate(e)); return; }
  if (/\/(3-)?sw\.js$/.test(u.pathname)) return;
  e.respondWith(asset(req));
});
