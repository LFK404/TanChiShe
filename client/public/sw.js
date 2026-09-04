// PWA 静态资源缓存控制与离线回退策略 (v3 极简双轨无缝 BGM 与矢量资源离线预存)
const CACHE_NAME = 'tanchishe-pwa-v3';

// 核心应用壳资源 (几 KB 级别，必须 100% 毫秒级安装完成)
const CORE_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
];

// 大体积音频资源 (约 3.7MB，独立异步容错预存，不阻塞 PWA 离线安装)
const AUDIO_ASSETS = [
  '/audio/Afternoon_Geometry.mp3',
  '/audio/Victory_at_the_Arcade.mp3',
];

// 1. 安装阶段：强保证预缓存核心壳资产，渐进式静默预存音频
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 优先确保核心页面瞬间就绪
      await cache.addAll(CORE_SHELL_ASSETS);
      // 异步容错预拉音频，即使弱网单曲失败也不影响离线玩核心游戏
      AUDIO_ASSETS.forEach((url) => {
        cache.add(url).catch(() => {});
      });
    })
  );
  self.skipWaiting();
});

// 2. 激活阶段：清理旧版本缓存 (自动淘汰 v1 缓存)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 网络请求拦截：Stale-While-Revalidate 策略 (忽略 /api/ 动态请求)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // 后台静默刷新缓存并返回已缓存内容
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/');
        });
    })
  );
});
