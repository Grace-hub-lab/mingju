// Service Worker：网络优先（保证拿到最新版本），离线时用缓存
// 修改前端文件后把 VERSION 加 1，已安装的 PWA 会自动更新
// 全部使用相对路径，部署在子目录（如 GitHub Pages 的 /repo/）也能用
const VERSION = 'v2';
const CACHE = `mingju-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './quotes.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' 绕过浏览器 HTTP 缓存，避免预缓存到旧文件
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) =>
      fetch(new Request(u, { cache: 'reload' })).then((r) => r.ok && c.put(u, r))
    )))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mingju-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
      )
  );
});
