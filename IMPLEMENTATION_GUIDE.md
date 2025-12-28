# TALKROOM 완성 가이드

이 문서는 MVP 이후 완성까지 완료된 작업과 추가 작업 가이드를 정리합니다.

## ✅ 완료된 작업

### 1. 결제 시스템 실제 연동 (토스페이먼츠) ✅
- **구현 파일**:
  - `src/pages/Payment.tsx` - TossPayments SDK 통합
  - `src/pages/PaymentSuccess.tsx` - 결제 성공 처리
  - `src/pages/PaymentFail.tsx` - 결제 실패 처리
- **기능**:
  - 토스페이먼츠 SDK 로드 및 초기화
  - 카드/계좌이체/휴대폰 결제 지원
  - 결제 성공 시 room_participants 테이블에 자동 등록
  - 결제 실패 시 사용자 친화적 에러 메시지

### 2. 미디어 업로드 기능 구현 ✅
- **구현 파일**:
  - `src/pages/CreateRoom.tsx` - 파일 업로드 UI 및 로직
  - `supabase/migrations/20250102000000_create_storage_buckets.sql` - Storage 버킷 및 RLS 정책
- **기능**:
  - `room-media`, `user-avatars` 버킷 생성
  - 파일 크기 제한 (10MB)
  - 이미지/비디오/오디오 파일 업로드
  - Public URL 자동 생성

### 3. 에러 바운더리 및 전역 에러 핸들링 ✅
- **구현 파일**:
  - `src/components/ErrorBoundary.tsx`
  - `src/App.tsx` - ErrorBoundary 적용
- **기능**:
  - React Error Boundary로 전역 에러 캐치
  - 사용자 친화적 에러 페이지
  - 개발 모드에서 상세 에러 정보 표시
  - 페이지 새로고침 및 홈으로 이동 버튼

### 4. Profile 더미 데이터 제거 ✅
- **구현 파일**: `src/pages/Profile.tsx`
- **변경 사항**:
  - 하드코딩된 `ongoingChallenges` 배열 제거
  - 하드코딩된 `weeklyPattern` 배열을 daily_logs 실제 데이터로 대체
  - 최근 7일간 사용자의 morning_promise와 evening_review 기반 주간 패턴 계산

### 5. Community 챌린지 섹션 제거 ✅
- **구현 파일**: `src/pages/Community.tsx`
- **변경 사항**:
  - 하드코딩된 챌린지 섹션 제거
  - 추후 DB 기반 챌린지 시스템 구현 시 추가 가능

### 6. Storage 연동 완료 ✅
- room-media, user-avatars 버킷 생성 및 RLS 정책 적용
- CreateRoom 컴포넌트에서 실제 파일 업로드 가능

---

## 🚧 추가 작업 필요 사항

### 7. 실시간 알림 푸시 구현
**현재 상태**: localStorage 기반 알림 설정만 존재

**구현 방법**:
```typescript
// public/firebase-messaging-sw.js 생성
// Firebase Cloud Messaging 설정
npm install firebase

// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
```

**Supabase Edge Function**:
```sql
-- supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { userId, title, message } = await req.json()

  // FCM으로 알림 전송
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`
    },
    body: JSON.stringify({
      to: userToken,
      notification: { title, body: message }
    })
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 8. RLS 정책 검증 및 보완
**작업 내용**:
```sql
-- 모든 테이블의 RLS 정책 검증
-- users 테이블
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- talk_rooms 테이블
CREATE POLICY "Public rooms are viewable by everyone"
ON public.talk_rooms FOR SELECT
USING (is_public = true OR host_id = auth.uid());

CREATE POLICY "Only hosts can update their rooms"
ON public.talk_rooms FOR UPDATE
USING (host_id = auth.uid());

-- room_participants 테이블
CREATE POLICY "Participants can view their own participation"
ON public.room_participants FOR SELECT
USING (user_id = auth.uid() OR room_id IN (
  SELECT id FROM talk_rooms WHERE host_id = auth.uid()
));

-- daily_logs 테이블
CREATE POLICY "Users can manage their own logs"
ON public.daily_logs FOR ALL
USING (user_id = auth.uid());

-- feed_posts 테이블
CREATE POLICY "Anyone can view public posts"
ON public.feed_posts FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.feed_posts FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### 9. Edge Functions 구현
**필요한 Functions**:

1. **통계 집계 Function**:
```typescript
// supabase/functions/aggregate-stats/index.ts
serve(async (req) => {
  // 매일 자정 실행
  // 1. 사용자별 streak_days 계산 및 업데이트
  // 2. 토크룸별 평균 평점 계산
  // 3. 카테고리별 통계 집계
})
```

2. **알림 스케줄러**:
```typescript
// supabase/functions/schedule-notifications/index.ts
serve(async (req) => {
  // 아침 다짐 알림 (07:00)
  // 저녁 성과 알림 (21:00)
  // 토크룸 시작 1시간 전 알림
})
```

### 10. SEO 최적화
**구현 방법**:
```typescript
// src/components/SEO.tsx
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description, image, url }) => {
  const fullTitle = `${title} - TALKROOM`;
  const fullUrl = url || window.location.href;
  const defaultImage = `${window.location.origin}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:url" content={fullUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image || defaultImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
};
```

**Sitemap 생성**:
```typescript
// scripts/generate-sitemap.ts
import { supabase } from './supabase';
import fs from 'fs';

async function generateSitemap() {
  const { data: rooms } = await supabase
    .from('talk_rooms')
    .select('id, updated_at')
    .eq('is_public', true);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${rooms.map(room => `
  <url>
    <loc>https://yourdomain.com/rooms/${room.id}</loc>
    <lastmod>${room.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`;

  fs.writeFileSync('public/sitemap.xml', sitemap);
}
```

### 11. 성능 최적화
**구현 방법**:
```typescript
// vite.config.ts - 코드 스플리팅
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
        }
      }
    }
  }
});

// Lazy loading
import { lazy, Suspense } from 'react';

const Community = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));

<Suspense fallback={<Loader />}>
  <Community />
</Suspense>
```

**이미지 최적화**:
```typescript
// src/components/OptimizedImage.tsx
export const OptimizedImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      srcSet={`${src}?w=400 400w, ${src}?w=800 800w, ${src}?w=1200 1200w`}
      sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
    />
  );
};
```

### 12. 접근성(a11y) 개선
**구현 체크리스트**:
- [ ] 모든 이미지에 alt 텍스트 추가
- [ ] 버튼에 aria-label 추가
- [ ] 키보드 네비게이션 테스트
- [ ] Skip to content 링크 추가
- [ ] Focus visible 스타일링
- [ ] ARIA landmarks 추가

```typescript
// src/components/SkipToContent.tsx
export const SkipToContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white"
  >
    Skip to main content
  </a>
);
```

### 13. Admin/Host 대시보드 기능
**구현 파일**: `src/pages/HostDashboard.tsx`
```typescript
export default function HostDashboard() {
  // 1. 내가 만든 토크룸 목록
  // 2. 토크룸별 참가자 수, 수익
  // 3. 토크룸별 리뷰 평균 점수
  // 4. 최근 리뷰 목록
  // 5. 월별 수익 그래프

  return (
    <div>
      <h1>호스트 대시보드</h1>
      {/* 통계 카드들 */}
      {/* 토크룸 목록 테이블 */}
      {/* 리뷰 관리 섹션 */}
    </div>
  );
}
```

### 14. 환불 정책 및 처리 로직
**DB 마이그레이션**:
```sql
-- refunds 테이블 생성
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  room_id UUID REFERENCES talk_rooms(id),
  amount_cents INTEGER NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

**환불 정책**:
- 토크룸 시작 24시간 전: 100% 환불
- 토크룸 시작 24시간 이내: 50% 환불
- 토크룸 시작 후: 환불 불가

### 15. 리뷰/평점 시스템 완성
**DB 마이그레이션**:
```sql
-- reviews 테이블에 rating 컬럼 추가
ALTER TABLE reviews ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 평균 평점 계산 함수
CREATE OR REPLACE FUNCTION calculate_room_rating(room_id_param UUID)
RETURNS DECIMAL AS $$
  SELECT AVG(rating)::DECIMAL(3,2)
  FROM reviews
  WHERE room_id = room_id_param AND rating IS NOT NULL;
$$ LANGUAGE SQL;
```

**UI 구현**:
```typescript
// src/components/RatingStars.tsx
export const RatingStars: React.FC<{ rating: number; onChange?: (rating: number) => void }> = ({
  rating,
  onChange
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange?.(star)}
          className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
        >
          ⭐
        </button>
      ))}
    </div>
  );
};
```

---

## 환경 변수 설정

`.env` 파일에 다음 환경 변수 추가:
```bash
# TossPayments
VITE_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq

# Firebase (알림용)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Supabase Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FCM_SERVER_KEY=your_fcm_server_key
```

---

## 배포 체크리스트

- [ ] 모든 환경 변수 프로덕션 설정
- [ ] Supabase 프로덕션 데이터베이스 마이그레이션
- [ ] Storage 버킷 프로덕션 설정
- [ ] Edge Functions 배포
- [ ] 도메인 설정 및 SSL 인증서
- [ ] robots.txt 및 sitemap.xml 생성
- [ ] 에러 로깅 서비스 연동 (Sentry, LogRocket)
- [ ] 성능 모니터링 설정
- [ ] SEO 메타 태그 검증
- [ ] 접근성 테스트 (WAVE, axe)
- [ ] 크로스 브라우저 테스트
- [ ] 모바일 반응형 테스트

---

## 완료!

이 가이드를 따라 모든 작업을 완료하면 TALKROOM은 프로덕션 레벨의 완성된 서비스가 됩니다.
