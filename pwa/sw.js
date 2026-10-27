/* Ficha de Sangue — service worker (gerado pelo build.js; versão __VERSAO__)
   - páginas: rede primeiro (deploy novo aparece na hora); sem internet, a última cópia guardada
   - arquivos do site: devolve o guardado e atualiza em segundo plano
   - /api/: nunca passa por aqui (conta, fichas e mapa são sempre ao vivo) */
const CACHE = 'ficha-de-sangue-__VERSAO__';
const FONTES = 'ficha-de-sangue-fontes';
const BASICO = ['/', '/entrar/', '/mapa/', '/mapa/app.js', '/mapa/carregar.js', '/manifest.webmanifest',
  '/icones/icone-192.png', '/icones/icone-512.png', '/icones/apple-touch-icon.png', '/icones/favicon-64.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICO)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function paginaBase(url) {
  if (url.pathname.startsWith('/mapa')) return '/mapa/';
  if (url.pathname.startsWith('/entrar')) return '/entrar/';
  return '/';
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* fontes do Google: guardadas para sempre (os arquivos têm nome por versão) */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    ev.respondWith(caches.open(FONTES).then(async c => {
      const g = await c.match(req);
      if (g) return g;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  if (req.mode === 'navigate') {
    ev.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await fetch(req);
        if (r.ok) c.put(paginaBase(url), r.clone());
        return r;
      } catch (e) {
        return (await c.match(paginaBase(url))) || (await c.match('/')) ||
          new Response('<h1>Sem internet</h1><p>Abra o site uma vez com internet para usar sem ela.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  ev.respondWith((async () => {
    const c = await caches.open(CACHE);
    const g = await c.match(req, { ignoreSearch: true });
    const rede = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (g) { ev.waitUntil(rede); return g; }
    return (await rede) || new Response('', { status: 504 });
  })());
});
