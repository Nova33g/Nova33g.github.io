// Download helper: streams an audio file from the source host, adds a name and ID3 tags,
// and hands it to the browser's own download manager.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
function id3(t) {
  const enc = s => { const o = new Uint8Array(3 + s.length * 2); o[0] = 1; o[1] = 0xff; o[2] = 0xfe; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); o[3 + i * 2] = c & 255; o[4 + i * 2] = c >> 8; } return o; };
  const frame = (id, b) => { const f = new Uint8Array(10 + b.length); for (let i = 0; i < 4; i++) f[i] = id.charCodeAt(i); f[4] = (b.length >>> 24) & 255; f[5] = (b.length >>> 16) & 255; f[6] = (b.length >>> 8) & 255; f[7] = b.length & 255; f.set(b, 10); return f; };
  const parts = [frame('TIT2', enc(t.title)), frame('TPE1', enc(t.artist)), frame('TPE2', enc(t.artist)), frame('TALB', enc(t.album)), frame('TRCK', enc(t.track + '/' + t.of)), frame('TCON', enc('Quran'))];
  const len = parts.reduce((x, p) => x + p.length, 0);
  const out = new Uint8Array(10 + len);
  out.set([0x49, 0x44, 0x33, 3, 0, 0, (len >>> 21) & 127, (len >>> 14) & 127, (len >>> 7) & 127, len & 127]);
  let o = 10; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function say(id, state) { if (!id) return; const cs = await self.clients.matchAll({ includeUncontrolled: true }); cs.forEach(c => c.postMessage({ dl: id, state })); }
async function handle(url) {
  const p = url.searchParams; const did = p.get('id') || '';
  const src = p.get('u') || '';
  let su; try { su = new URL(src); } catch (e) { return new Response('bad', { status: 400 }); }
  if (su.protocol !== 'https:' || !/(^|\.)mp3quran\.net$/.test(su.hostname)) return new Response('bad', { status: 400 });
  const name = (p.get('f') || 'quran.mp3').replace(/[\\/:*?"<>|]/g, '');
  let upstream; try { upstream = await fetch(su.href); } catch (e) { say(did, 'fail'); return new Response('net', { status: 502 }); }
  if (!upstream.ok || !upstream.body) return new Response('upstream ' + upstream.status, { status: 502 });
  const tag = id3({ title: p.get('ti') || '', artist: p.get('ar') || '', album: p.get('al') || '', track: p.get('tr') || '1', of: '114' });
  const total = Number(upstream.headers.get('content-length')) || 0;
  const reader = upstream.body.getReader();
  let first = new Uint8Array(0);
  while (first.length < 10) { const r = await reader.read(); if (r.done) break; const m = new Uint8Array(first.length + r.value.length); m.set(first); m.set(r.value, first.length); first = m; }
  const skip = (first.length >= 10 && first[0] === 0x49 && first[1] === 0x44 && first[2] === 0x33) ? 10 + ((first[6] & 127) << 21 | (first[7] & 127) << 14 | (first[8] & 127) << 7 | (first[9] & 127)) + ((first[5] & 0x10) ? 10 : 0) : 0;
  let skipped = 0, started = false;
  const stream = new ReadableStream({
    async pull(ctl) {
      if (!started) { started = true; ctl.enqueue(tag); }
      for (;;) {
        let chunk;
        if (first) { chunk = first; first = null; }
        else { const r = await reader.read(); if (r.done) { ctl.close(); say(did, 'done'); return; } chunk = r.value; }
        if (skipped < skip) { const cut = Math.min(skip - skipped, chunk.length); skipped += cut; chunk = chunk.subarray(cut); }
        if (chunk.length) { ctl.enqueue(chunk); return; }
      }
    },
    cancel() { reader.cancel(); say(did, 'cancel'); }
  });
  const h = new Headers({ 'Content-Type': 'audio/mpeg', 'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name), 'Cache-Control': 'no-store' });
  if (total > skip) h.set('Content-Length', String(tag.length + total - skip));
  return new Response(stream, { status: 200, headers: h });
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && url.pathname === '/__dl') e.respondWith(handle(url));
});
