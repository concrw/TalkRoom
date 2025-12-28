// Firebase Cloud Messaging Service Worker
// 백그라운드에서 푸시 알림을 수신하기 위한 Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 설정 (환경 변수는 빌드 시 주입됨)
const firebaseConfig = {
  apiKey: "VITE_FIREBASE_API_KEY",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 핸들러
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || '새로운 알림';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon.png',
    badge: '/badge.png',
    tag: payload.data?.type || 'general',
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 핸들러
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification.tag);

  event.notification.close();

  // 알림 타입에 따라 다른 페이지로 이동
  const urlToOpen = (() => {
    const data = event.notification.data;

    switch (data?.type) {
      case 'room_start':
        return `/rooms/${data.room_id}`;
      case 'review_request':
        return `/review/${data.room_id}`;
      case 'daily_reminder':
        return '/daily';
      case 'refund_approved':
        return '/profile';
      default:
        return '/notifications';
    }
  })();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려있는 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
