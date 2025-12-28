# TALKROOM 수동 배포 가이드

CLI 환경 제약으로 Supabase Dashboard에서 직접 배포하는 가이드입니다.

---

## 📋 1단계: 데이터베이스 마이그레이션 (5분)

### Supabase Dashboard에서 SQL 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/ctvdsjzazqoodeqenwza
   - 로그인 후 SQL Editor 메뉴 클릭

2. **첫 번째 마이그레이션 실행**

   **New Query 클릭 후 다음 SQL 복사/붙여넣기:**

```sql
-- ============================================
-- Migration 1: Storage Buckets 생성
-- ============================================

-- Storage buckets 생성
INSERT INTO storage.buckets (id, name, public) VALUES
  ('room-media', 'room-media', true),
  ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- room-media 버킷 정책
CREATE POLICY "Anyone can view room media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'room-media');

CREATE POLICY "Authenticated users can upload room media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'room-media');

CREATE POLICY "Users can update their own room media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'room-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own room media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'room-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- user-avatars 버킷 정책
CREATE POLICY "Anyone can view user avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

   **▶ Run 버튼 클릭하여 실행**

3. **두 번째 마이그레이션 실행**

   **New Query 클릭 후 다음 SQL 복사/붙여넣기:**

```sql
-- ============================================
-- Migration 2: Refunds & Ratings 시스템
-- ============================================

-- refunds 테이블 생성
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES talk_rooms(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- refunds RLS 정책
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refunds"
ON refunds FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create refund requests"
ON refunds FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- reviews 테이블에 rating 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reviews' AND column_name = 'rating'
  ) THEN
    ALTER TABLE reviews ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

-- talk_rooms 테이블에 avg_rating 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'talk_rooms' AND column_name = 'avg_rating'
  ) THEN
    ALTER TABLE talk_rooms ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT 0;
  END IF;
END $$;

-- users 테이블에 fcm_token 컬럼 추가 (푸시 알림용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'fcm_token'
  ) THEN
    ALTER TABLE users ADD COLUMN fcm_token TEXT;
  END IF;
END $$;

-- 평균 평점 계산 함수
CREATE OR REPLACE FUNCTION calculate_room_rating(room_id_param UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
  FROM reviews
  WHERE room_id = room_id_param AND rating IS NOT NULL;
$$ LANGUAGE SQL;

-- 리뷰 작성 시 평균 평점 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_room_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE talk_rooms
  SET avg_rating = calculate_room_rating(NEW.room_id)
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_room_rating ON reviews;
CREATE TRIGGER trigger_update_room_rating
AFTER INSERT OR UPDATE OF rating ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_room_rating();

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;
```

   **▶ Run 버튼 클릭하여 실행**

4. **마이그레이션 검증**

```sql
-- 버킷 확인
SELECT * FROM storage.buckets WHERE id IN ('room-media', 'user-avatars');

-- refunds 테이블 확인
SELECT * FROM refunds LIMIT 1;

-- 컬럼 추가 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'reviews' AND column_name = 'rating';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'talk_rooms' AND column_name = 'avg_rating';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'fcm_token';
```

---

## 📋 2단계: Edge Functions 배포 (10분)

### 방법 1: Supabase Dashboard에서 직접 생성

1. **Supabase Dashboard > Edge Functions**
   - https://supabase.com/dashboard/project/ctvdsjzazqoodeqenwza/functions

2. **Function 1: send-notification**

   **Create a new function 클릭**
   - Function name: `send-notification`
   - 다음 코드 복사/붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, message, type = 'system' } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. DB에 알림 저장
    const { error: dbError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        read: false,
      })

    if (dbError) throw dbError

    // 2. 사용자 FCM 토큰 조회
    const { data: userData } = await supabaseClient
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single()

    // 3. FCM 푸시 알림 전송
    if (userData?.fcm_token) {
      const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')

      if (fcmServerKey) {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${fcmServerKey}`
          },
          body: JSON.stringify({
            to: userData.fcm_token,
            notification: {
              title,
              body: message,
              icon: '/icon.png',
              click_action: 'https://yourdomain.com/notifications'
            },
            data: { type }
          })
        })

        const fcmResult = await fcmResponse.json()
        console.log('FCM response:', fcmResult)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

   **Environment Variables 설정:**
   - `FCM_SERVER_KEY`: Firebase Console에서 발급받은 서버 키

3. **Function 2: aggregate-stats**

   **Create a new function 클릭**
   - Function name: `aggregate-stats`
   - 다음 코드 복사/붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 1. 모든 사용자의 streak_days 업데이트
    const { data: users } = await supabaseClient
      .from('users')
      .select('id, streak_days')

    for (const user of users || []) {
      const { data: recentLogs } = await supabaseClient
        .from('daily_logs')
        .select('log_date, morning_promise, evening_review')
        .eq('user_id', user.id)
        .in('log_date', [yesterday, today])
        .order('log_date', { ascending: false })

      let newStreak = user.streak_days || 0
      const todayLog = recentLogs?.find(l => l.log_date === today)
      const yesterdayLog = recentLogs?.find(l => l.log_date === yesterday)

      if (todayLog?.morning_promise && todayLog?.evening_review) {
        if (yesterdayLog?.morning_promise && yesterdayLog?.evening_review) {
          newStreak += 1
        } else {
          newStreak = 1
        }
      } else if (!yesterdayLog?.morning_promise || !yesterdayLog?.evening_review) {
        newStreak = 0
      }

      await supabaseClient
        .from('users')
        .update({ streak_days: newStreak })
        .eq('id', user.id)
    }

    // 2. 토크룸별 평균 평점 업데이트 (트리거가 처리하므로 생략 가능)

    return new Response(
      JSON.stringify({ success: true, message: 'Stats aggregated successfully' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

   **Cron Schedule 설정:**
   - Schedule: `0 0 * * *` (매일 자정 UTC)

4. **Function 3: process-refund**

   **Create a new function 클릭**
   - Function name: `process-refund`
   - 다음 코드 복사/붙여넣기:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, roomId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. 토크룸 정보 조회
    const { data: room, error: roomError } = await supabaseClient
      .from('talk_rooms')
      .select('id, title, price_cents, starts_at')
      .eq('id', roomId)
      .single()

    if (roomError) throw roomError

    // 2. 환불 정책 확인
    const now = new Date()
    const startsAt = new Date(room.starts_at)
    const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refundPercentage = 0
    let refundReason = ''

    if (hoursUntilStart >= 24) {
      refundPercentage = 100
      refundReason = '시작 24시간 전 취소'
    } else if (hoursUntilStart > 0) {
      refundPercentage = 50
      refundReason = '시작 24시간 이내 취소'
    } else {
      return new Response(
        JSON.stringify({ error: '토크룸 시작 후에는 환불이 불가능합니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const refundAmount = Math.round(room.price_cents * (refundPercentage / 100))

    // 3. refunds 테이블에 환불 요청 생성
    const { data: refund, error: refundError } = await supabaseClient
      .from('refunds')
      .insert({
        user_id: userId,
        room_id: roomId,
        amount_cents: refundAmount,
        reason: refundReason,
        status: 'pending'
      })
      .select()
      .single()

    if (refundError) throw refundError

    // 4. 실제 결제 취소 (TossPayments or Stripe)
    // TODO: 실제 환불 API 호출
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

    // 예시: TossPayments 환불
    // const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/{paymentKey}/cancel', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${btoa(tossSecretKey + ':')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     cancelReason: refundReason,
    //     cancelAmount: refundAmount
    //   })
    // })

    // 5. refunds 상태 업데이트
    await supabaseClient
      .from('refunds')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('id', refund.id)

    // 6. 알림 전송
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        userId,
        title: '환불 승인',
        message: `${room.title} 환불이 승인되었습니다. (${refundPercentage}% 환불)`,
        type: 'refund_approved'
      })
    })

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          amount: refundAmount,
          percentage: refundPercentage,
          reason: refundReason
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

   **Environment Variables 설정:**
   - `TOSS_SECRET_KEY`: 토스페이먼츠 Secret Key
   - `STRIPE_SECRET_KEY`: Stripe Secret Key

---

## 📋 3단계: Firebase 설정 (10분)

### Firebase Console 설정

1. **Firebase 프로젝트 생성**
   - https://console.firebase.google.com/
   - "프로젝트 추가" 클릭
   - 프로젝트 이름: `talkroom-prod`

2. **Cloud Messaging 활성화**
   - 프로젝트 설정 > Cloud Messaging
   - "Cloud Messaging API (V1)" 사용 설정

3. **웹 앱 추가 및 구성 정보 복사**
   - 프로젝트 개요 > 웹 앱 추가
   - 앱 닉네임: `talkroom-web`
   - Firebase SDK 구성 정보 복사:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIza...",
       projectId: "talkroom-prod",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abc123"
     };
     ```

4. **VAPID 키 발급**
   - 프로젝트 설정 > Cloud Messaging > 웹 구성
   - "키 쌍 생성" 클릭
   - VAPID 키 복사

5. **FCM 서버 키 발급**
   - 프로젝트 설정 > 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드
   - `private_key` 값을 `FCM_SERVER_KEY`로 사용

6. **.env 파일 업데이트**
   ```bash
   VITE_FIREBASE_API_KEY="실제_API_키"
   VITE_FIREBASE_PROJECT_ID="talkroom-prod"
   VITE_FIREBASE_MESSAGING_SENDER_ID="실제_SENDER_ID"
   VITE_FIREBASE_APP_ID="실제_APP_ID"
   VITE_FIREBASE_VAPID_KEY="실제_VAPID_키"
   ```

7. **Supabase Edge Function 환경 변수 설정**
   - Supabase Dashboard > Edge Functions > send-notification > Settings
   - `FCM_SERVER_KEY` 추가

---

## 📋 4단계: 결제 시스템 실제 키 등록 (5분)

### TossPayments

1. [토스페이먼츠 개발자센터](https://developers.tosspayments.com/) 로그인
2. 내 애플리케이션 > API 키
3. **테스트 키** → **라이브 키** 전환
4. `.env` 업데이트:
   ```bash
   VITE_TOSS_CLIENT_KEY="live_ck_실제키"
   ```
5. Supabase Edge Function 환경 변수:
   - `TOSS_SECRET_KEY="live_sk_실제키"`

### Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com/) 로그인
2. Developers > API keys
3. Publishable key, Secret key 복사
4. `.env` 업데이트:
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY="pk_live_실제키"
   ```
5. Supabase Edge Function 환경 변수:
   - `STRIPE_SECRET_KEY="sk_live_실제키"`

---

## 📋 5단계: 검증 및 테스트

### 기능 테스트
- [ ] 로그인/회원가입
- [ ] 토크룸 생성 + 이미지 업로드
- [ ] 결제 (TossPayments)
- [ ] 리뷰 작성 및 평점 확인
- [ ] 환불 요청
- [ ] 푸시 알림 수신

### SQL 검증
```sql
-- Storage 버킷 확인
SELECT * FROM storage.buckets;

-- refunds 테이블 확인
SELECT * FROM refunds;

-- 평점 컬럼 확인
SELECT id, avg_rating FROM talk_rooms WHERE avg_rating > 0 LIMIT 5;
```

---

## ✅ 배포 완료!

모든 단계를 완료하면 TALKROOM이 프로덕션 레벨로 완성됩니다.
