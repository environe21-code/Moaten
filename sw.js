/* 모아텐 서비스워커 v3
   - 접속 시 기기에 남아 있던 모든 옛 저장본(v1, v2)을 삭제
   - 게임(index.html)은 항상 인터넷에서 최신을 먼저 받고, 오프라인일 때만 저장본 사용
   → GitHub에서 게임을 수정하면 모든 사용자에게 다음 실행 때 반영됩니다 */
const CACHE = 'moaten-v3';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebaseio.com')) return;   // 랭킹은 항상 인터넷

  const isPage = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');

  if (isPage) {
    // 최신 우선: 인터넷 → 실패 시 저장본
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // 고정 파일(아이콘 등): 저장본 우선
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (e.request.method === 'GET' && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }))
    );
  }
});
