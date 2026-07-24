const CACHE_NAME = 'kaoyan-v2';
const STATIC_ASSETS = [
  '.',
  'index.html',
  'css/app.css',
  'js/supabase-config.js',
  'js/db.js',
  'js/data-adapter.js',
  'js/onboarding.js',
  'js/seed-data.js',
  'js/app.js',
  'js/dashboard.js',
  'js/knowledge-map.js',
  'js/upload.js',
  'js/review.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：静态资源走缓存，其他走网络
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin && STATIC_ASSETS.some(a => url.pathname.endsWith(a))) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
