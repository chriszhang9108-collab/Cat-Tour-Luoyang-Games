const CACHE_PREFIX = 'cat-tour-luoyang-pet';
const CACHE_NAME = `${CACHE_PREFIX}-v2`;
const SCOPE_URL = new URL('./', self.location.href);
const APP_ROOT_URL = SCOPE_URL.href;
const CORE_URLS = [
  APP_ROOT_URL,
  new URL('manifest.webmanifest', SCOPE_URL).href,
  new URL('icons/icon-192.png', SCOPE_URL).href,
  new URL('icons/icon-512.png', SCOPE_URL).href,
  new URL('icons/icon-maskable-512.png', SCOPE_URL).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch(APP_ROOT_URL, { cache: 'reload' });
    await cache.put(APP_ROOT_URL, shellResponse.clone());

    const html = await shellResponse.text();
    const linkedUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], SCOPE_URL))
      .filter((url) => url.origin === self.location.origin)
      .map((url) => url.href);

    const shellUrls = [...new Set([...CORE_URLS.slice(1), ...linkedUrls])];
    await cache.addAll(shellUrls);

    // Vite 会把图片地址写进构建后的 JS / CSS。安装时继续扫描这些入口，
    // 让玩家即使第一次只停留在启动页，离线后仍能进入选猫与撸猫页面。
    const bundledAssetUrls = new Set();
    for (const linkedUrl of linkedUrls) {
      const response = await cache.match(linkedUrl);
      const contentType = response?.headers.get('content-type') ?? '';
      if (!response || !/(javascript|css)/i.test(contentType)) continue;

      const source = await response.text();
      extractBundledAssetUrls(source, linkedUrl).forEach((url) => bundledAssetUrls.add(url));
    }

    await cache.addAll([...bundledAssetUrls]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
  })());
});

function extractBundledAssetUrls(source, sourceUrl) {
  const urls = [];
  const patterns = [
    /new URL\([`"']([^`"']+)[`"']\s*,\s*import\.meta\.url\)/g,
    /url\(["']?([^"')]+)["']?\)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of source.matchAll(pattern)) {
      const url = new URL(match[1], sourceUrl);
      if (url.origin === self.location.origin && url.pathname.startsWith(SCOPE_URL.pathname)) {
        urls.push(url.href);
      }
    }
  });

  return urls;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(APP_ROOT_URL, response.clone());
        return response;
      } catch {
        return (await caches.match(APP_ROOT_URL)) ?? Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
