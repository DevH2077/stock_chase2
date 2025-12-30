const CACHE_NAME = 'stock-pwa-v1';
const BASE_PATH = self.location.pathname.replace('/service-worker.js', '');
const urlsToCache = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/styles.css',
  BASE_PATH + '/app.js',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icon-192.png',
  BASE_PATH + '/icon-512.png'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기');
        return cache.addAll(urlsToCache);
      })
  );
});

// 백그라운드에서 주기적으로 알림 체크 (앱이 닫혀 있어도 작동)
let checkInterval = null;

// 백그라운드 체크 시작
function startBackgroundCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  
  // 30초마다 알림 체크
  checkInterval = setInterval(async () => {
    try {
      const clients = await self.clients.matchAll();
      if (clients.length > 0) {
        // 클라이언트에 메시지 전송하여 알림 체크 요청
        clients.forEach(client => {
          client.postMessage({
            type: 'CHECK_ALERTS',
            timestamp: Date.now()
          });
        });
      }
    } catch (error) {
      console.error('백그라운드 알림 체크 실패:', error);
    }
  }, 30 * 1000); // 30초마다
}

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // 캐시 정리
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 클라이언트 제어
      self.clients.claim()
    ]).then(() => {
      // 백그라운드 체크 시작
      startBackgroundCheck();
    })
  );
});

// fetch 이벤트 (네트워크 우선, 캐시 폴백)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답인지 확인
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 응답 복제
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const baseUrl = self.location.origin + self.location.pathname.replace('/service-worker.js', '');
  
  if (action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려있는 창이 있으면 포커스
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(baseUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(baseUrl + '/index.html');
      }
    })
  );
});

// 백그라운드에서 알림 발송 (push 이벤트)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📈 주식 알림';
  const options = {
    body: data.body || '알림이 도착했습니다.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// Background Sync 이벤트 (앱이 닫혀 있어도 실행)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-alerts-sync') {
    event.waitUntil(
      checkAlertsAndNotify()
    );
  }
});

// 백그라운드에서 알림 체크 및 발송
async function checkAlertsAndNotify() {
  try {
    // 클라이언트에 알림 체크 요청
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHECK_ALERTS',
          timestamp: Date.now()
        });
      });
    }
  } catch (error) {
    console.error('Background Sync 알림 체크 실패:', error);
  }
}

// 클라이언트로부터 메시지 수신
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_ALERTS') {
    // 클라이언트가 알림 체크를 요청하면 응답
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ success: true });
    }
  }
  
  if (event.data && event.data.type === 'TRIGGER_ALERT') {
    // 알림 발송 요청
    const { title, message, alertId } = event.data;
    self.registration.showNotification(title, {
      body: message,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: `alert-${alertId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: self.location.origin + self.location.pathname.replace('/service-worker.js', '') + '/index.html',
        alertId: alertId
      },
      actions: [
        {
          action: 'view',
          title: '확인'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    });
  }
});

