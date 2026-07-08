// ELİFA Zikirmatik — çevrimdışı önbellek
// v10: yeni hilal-yıldız ikon + /api istekleri ASLA önbelleklenmez (Birlikte ortak verisi hep taze),
// sayfa gezinmeleri önce ağdan denenir (güncellemeler anında yansır).
const CACHE = 'elifa-zikirmatik-v13';
const ASSETS = [
  './index.html', './manifest.json',
  './icon-192.png', './icon-512.png',
  './icon-192-maskable.png', './icon-512-maskable.png',
  './elif-mask.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ortak veri: her zaman ağ, önbellek yok
  if (url.pathname.startsWith('/api/') || e.request.method !== 'GET') return;

  // Sayfa gezinmesi: önce ağ (güncel sürüm), düşerse önbellek (çevrimdışı)
  if (e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
