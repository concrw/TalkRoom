import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 앱 초기화
let app;
let messaging: Messaging | null = null;

try {
  app = initializeApp(firebaseConfig);

  // Messaging은 브라우저 환경에서만 사용 가능
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

/**
 * FCM 토큰 요청
 * @returns FCM 토큰 또는 null
 */
export async function requestFCMToken(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase Messaging is not available');
    return null;
  }

  try {
    // 알림 권한 요청
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // VAPID 키는 Firebase Console > Project Settings > Cloud Messaging에서 발급
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      const token = await getToken(messaging, { vapidKey });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('FCM token request error:', error);
    return null;
  }
}

/**
 * 포그라운드 메시지 리스너 등록
 * @param callback 메시지 수신 시 실행할 콜백 함수
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('Firebase Messaging is not available');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

export { messaging };
