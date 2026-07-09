const CACHE_NAME = 'livenote-v6.3.1.0';
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

// 安裝 Service Worker 並快取靜態資源，立即跳過等待
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 立即跳過等待，啟用新的 Service Worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS);
    })
  );
});

// 激活 Service Worker，清理過期快取並立即奪取控制權
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // 立即取得所有客戶端的控制權
  );
});

// 攔截請求：GAS API 僅走網路；靜態資源走 Network-First 且動態更新快取
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. 僅處理 http 與 https 協議請求，安全屏蔽 chrome-extension://, data:, file: 等不支援快取的協議
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // 2. GAS API 請求與本地圖片上傳請求不快取，確保資料即時性
  if (url.includes('script.google.com') || url.includes('action=getPresignedUrl')) {
    return;
  }

  // 3. 針對同源的 HTML、CSS、JS、JSON 等靜態資源，強制不使用瀏覽器 HTTP 快取，確保向伺服器拿最新版
  const isSameOriginStatic = url.startsWith(self.location.origin) && 
    (url.includes('.html') || url.includes('.css') || url.includes('.js') || url.includes('.json'));
  
  const fetchOptions = isSameOriginStatic ? { cache: 'no-cache' } : {};

  // 4. 靜態資源使用 Network-First，並在成功時動態更新快取，斷網時回退到快取
  event.respondWith(
    fetch(event.request, fetchOptions)
      .then((response) => {
        // 確保響應有效才寫入快取 (排除非 200 響應與外部 API 錯誤)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // 使用去除 query 參數的 URL 作為 key，以保持快取乾淨
            const cleanUrl = url.split('?')[0];
            cache.put(cleanUrl, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 斷網時從快取尋找 (ignoreSearch: true 可匹配帶有 ?v=xxx 的 URL)
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});