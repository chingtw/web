const CACHE_NAME = 'livenote-v2';
const ASSETS = [
  'shared.html',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 安裝 Service Worker 並快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS);
    })
  );
});

// 激活 Service Worker 並清理過期快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 攔截請求策略：對 GAS API 使用 Network Only，對靜態資源使用 Network First
self.addEventListener('fetch', (event) => {
  // GAS API 請求不快取，確保資料即時性
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      // 網路斷線或抓取失敗時，回退到快取中的資源
      return caches.match(event.request);
    })
  );
});