// Fordoquera sin internet (versión de GitHub): guarda la página, los íconos, las librerías, los libros y las fotos
// que ya se usaron. Siempre prueba primero internet (así las versiones nuevas llegan solas) y, si no hay conexión,
// usa lo guardado. Las librerías de afuera y las fotos publicadas no cambian: se usan las guardadas.
const CACHE = 'fordoquera-1';
const BASE = ['./', './manifest.json', './iconos/icono-192.png', './iconos/icono-512.png', './iconos/apple-touch-icon.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('fordoquera-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// primero internet; si no hay, lo guardado
async function redPrimero(req, clave){
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r && (r.ok || r.type === 'opaque')) c.put(clave || req, r.clone()).catch(() => {});
    return r;
  } catch(e){
    const g = await c.match(clave || req, {ignoreSearch:!clave && req.mode === 'navigate'}) || (req.mode === 'navigate' ? await c.match('./') : null);
    if (g) return g;
    throw e;
  }
}
// primero lo guardado (cosas que no cambian: librerías con su versión, fotos publicadas, letras)
async function guardadoPrimero(req){
  const c = await caches.open(CACHE), g = await c.match(req);
  if (g) return g;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(() => {});
  return r;
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;          // guardar, y videos o audios por partes: directo
  const u = new URL(req.url);
  if (u.pathname.endsWith('/version.json')) return;                       // saber si hay versión nueva: siempre a internet
  if (/firestore|identitytoolkit|securetoken/.test(u.hostname)) return;   // comentarios, proyectar: siempre a internet
  if (u.origin === location.origin && u.pathname.startsWith(new URL('./', location.href).pathname)) {
    // la página: la dirección con «?v=…» o «#…» es la misma página
    ev.respondWith(req.mode === 'navigate' ? redPrimero(req, new Request(new URL('./', location.href).href)) : redPrimero(req));
    return;
  }
  if (/(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(u.hostname)
      || (u.hostname.endsWith('github.io') && /\/espacios\/archivos\//.test(u.pathname))) { ev.respondWith(guardadoPrimero(req)); return; }
});
