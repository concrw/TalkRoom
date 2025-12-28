# TALKROOM 프로덕션 배포 체크리스트

## 📋 1단계: 로컬 환경 설정

### ✅ 완료된 작업
- [x] TossPayments SDK 통합
- [x] Stripe 패키지 설치
- [x] Firebase 패키지 설치
- [x] Supabase Storage 버킷 생성 스크립트
- [x] 환불 및 평점 시스템 마이그레이션
- [x] Edge Functions 작성 (3개)
- [x] 에러 바운더리 구현
- [x] 더미 데이터 제거

## 📋 2단계: Supabase 프로젝트 연동

### 1. Supabase CLI 로그인
```bash
supabase login
```

### 2. 프로젝트 링크
```bash
cd /Users/brandactivist/Desktop/TalkRoom
supabase link --project-ref ctvdsjzazqoodeqenwza
```

### 3. 데이터베이스 마이그레이션 적용
```bash
# 로컬에서 프로덕션 DB로 마이그레이션 푸시
supabase db push

# 또는 개별 마이그레이션 확인
supabase migration list
```

**적용될 마이그레이션**:
- `20250102000000_create_storage_buckets.sql` - Storage 버킷 생성
- `20250102000001_add_refunds_and_ratings.sql` - 환불/평점 시스템

## 📋 3단계: Edge Functions 배포

### 1. send-notification 배포
```bash
supabase functions deploy send-notification
```

**환경 변수 설정** (Supabase Dashboard):
- `FCM_SERVER_KEY` - Firebase Cloud Messaging 서버 키

### 2. aggregate-stats 배포
```bash
supabase functions deploy aggregate-stats
```

**Cron 스케줄 설정** (Supabase Dashboard > Edge Functions > aggregate-stats):
```
0 0 * * * (매일 자정 UTC)
```

### 3. process-refund 배포
```bash
supabase functions deploy process-refund
```

**환경 변수 설정** (Supabase Dashboard):
- `TOSS_SECRET_KEY` - TossPayments Secret Key
- `STRIPE_SECRET_KEY` - Stripe Secret Key

## 📋 4단계: Firebase 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `talkroom-prod`
4. Google Analytics 활성화 (선택)

### 2. Firebase Cloud Messaging 활성화
1. 프로젝트 설정 > Cloud Messaging
2. "Cloud Messaging API (V1) 사용 설정"
3. VAPID 키 생성

### 3. Firebase 웹 앱 추가
1. 프로젝트 개요 > 웹 앱 추가
2. 앱 닉네임: `talkroom-web`
3. Firebase SDK 구성 정보 복사

### 4. 환경 변수 업데이트
`.env` 파일 업데이트:
```bash
VITE_FIREBASE_API_KEY="실제_API_키"
VITE_FIREBASE_PROJECT_ID="실제_프로젝트_ID"
VITE_FIREBASE_MESSAGING_SENDER_ID="실제_SENDER_ID"
VITE_FIREBASE_APP_ID="실제_APP_ID"
VITE_FIREBASE_VAPID_KEY="실제_VAPID_키"
```

### 5. FCM 서버 키 설정
1. Firebase Console > 프로젝트 설정 > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. Supabase Dashboard > Edge Functions > send-notification > Settings
4. 환경 변수 `FCM_SERVER_KEY` 추가

## 📋 5단계: 결제 시스템 설정

### TossPayments
1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 가입
2. 테스트 키 → 라이브 키 전환
3. `.env` 업데이트:
```bash
VITE_TOSS_CLIENT_KEY="live_ck_실제키"
```
4. Supabase Edge Functions 환경 변수 설정:
```
TOSS_SECRET_KEY=live_sk_실제키
```

### Stripe (국제 결제용)
1. [Stripe Dashboard](https://dashboard.stripe.com/) 가입
2. API 키 발급
3. `.env` 업데이트:
```bash
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_실제키"
```
4. Supabase Edge Functions 환경 변수 설정:
```
STRIPE_SECRET_KEY=sk_live_실제키
```

## 📋 6단계: 프론트엔드 빌드 및 배포

### 1. 환경 변수 검증
```bash
cat .env
# 모든 키가 실제 값으로 채워졌는지 확인
```

### 2. 프로덕션 빌드
```bash
npm run build
```

### 3. 빌드 결과 확인
```bash
npm run preview
```

### 4. Netlify/Vercel 배포

#### Netlify 배포
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 배포
netlify deploy --prod
```

**환경 변수 설정** (Netlify Dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TOSS_CLIENT_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

#### Vercel 배포
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel --prod
```

## 📋 7단계: 배포 후 검증

### 기능 테스트 체크리스트
- [ ] 회원가입/로그인 테스트
- [ ] 토크룸 생성 (미디어 업로드 포함)
- [ ] 토크룸 결제 (TossPayments)
- [ ] 결제 성공 시 참가자 등록 확인
- [ ] 리뷰 작성 및 평점 업데이트 확인
- [ ] 환불 요청 (24시간 전)
- [ ] 환불 요청 (24시간 이내)
- [ ] 푸시 알림 수신 (브라우저 권한 허용 필요)
- [ ] 일일 미션 작성 (morning_promise, evening_review)
- [ ] 프로필 통계 확인 (streak_days, 주간 패턴)
- [ ] 에러 바운더리 테스트 (의도적 에러 발생)

### DB 검증
```sql
-- Supabase SQL Editor에서 실행

-- 1. Storage 버킷 확인
SELECT * FROM storage.buckets;

-- 2. refunds 테이블 확인
SELECT * FROM refunds LIMIT 5;

-- 3. reviews 테이블에 rating 컬럼 확인
SELECT id, rating, room_id FROM reviews LIMIT 5;

-- 4. talk_rooms 테이블에 avg_rating 컬럼 확인
SELECT id, title, avg_rating FROM talk_rooms LIMIT 5;

-- 5. users 테이블에 fcm_token 컬럼 확인
SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL LIMIT 5;

-- 6. 트리거 확인
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_update_room_rating';
```

### Edge Functions 검증
```bash
# send-notification 테스트
curl -X POST https://ctvdsjzazqoodeqenwza.supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-uuid","title":"테스트","message":"알림 테스트"}'

# aggregate-stats 수동 실행
curl -X POST https://ctvdsjzazqoodeqenwza.supabase.co/functions/v1/aggregate-stats \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# process-refund 테스트
curl -X POST https://ctvdsjzazqoodeqenwza.supabase.co/functions/v1/process-refund \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-uuid","roomId":"room-uuid"}'
```

## 📋 8단계: 모니터링 설정 (선택 사항)

### Sentry 에러 트래킹
```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Google Analytics
```typescript
// src/lib/analytics.ts
import ReactGA from "react-ga4";

ReactGA.initialize("G-YOUR_GA_ID");

export const logPageView = (page: string) => {
  ReactGA.send({ hitType: "pageview", page });
};
```

## 📋 9단계: SEO 설정 (선택 사항)

### 1. robots.txt
```txt
# public/robots.txt
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

### 2. sitemap.xml 생성
```bash
npm install sitemap
```

```typescript
// scripts/generate-sitemap.ts
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { supabase } from '../src/lib/supabase';

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname: 'https://yourdomain.com' });
  const writeStream = createWriteStream('public/sitemap.xml');

  sitemap.pipe(writeStream);

  // 홈페이지
  sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });

  // 토크룸 목록
  const { data: rooms } = await supabase
    .from('talk_rooms')
    .select('id, updated_at')
    .eq('is_public', true);

  rooms?.forEach(room => {
    sitemap.write({
      url: `/rooms/${room.id}`,
      lastmod: room.updated_at,
      changefreq: 'weekly',
      priority: 0.8
    });
  });

  sitemap.end();
}

generateSitemap();
```

### 3. package.json 스크립트 추가
```json
{
  "scripts": {
    "generate-sitemap": "tsx scripts/generate-sitemap.ts"
  }
}
```

## 📋 10단계: 성능 최적화 (선택 사항)

### 1. 코드 스플리팅
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Community = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));

<Suspense fallback={<Loader />}>
  <Routes>
    <Route path="/community" element={<Community />} />
    <Route path="/profile" element={<Profile />} />
  </Routes>
</Suspense>
```

### 2. 이미지 최적화
```bash
npm install vite-plugin-imagemin -D
```

```typescript
// vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      webp: { quality: 80 }
    })
  ]
});
```

## ✅ 배포 완료!

모든 체크리스트를 완료하면 TALKROOM은 프로덕션 레벨의 완성된 서비스가 됩니다.

---

## 🆘 문제 해결

### 마이그레이션 실패 시
```bash
# 마이그레이션 상태 확인
supabase migration list

# 특정 마이그레이션 롤백
supabase db reset

# 다시 적용
supabase db push
```

### Edge Function 오류 시
```bash
# 로그 확인
supabase functions logs send-notification --tail

# 재배포
supabase functions deploy send-notification --no-verify-jwt
```

### Firebase 알림 안 올 때
1. 브라우저 알림 권한 확인
2. `firebase-messaging-sw.js` 등록 확인 (개발자 도구 > Application > Service Workers)
3. FCM 토큰 발급 확인 (Console 로그)
4. Supabase `users.fcm_token` 저장 확인
