-- ============================================
-- TALKROOM 전체 마이그레이션
-- Supabase SQL Editor에 복사/붙여넣기 후 실행
-- ============================================

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
  WHERE talk_room_id = room_id_param AND rating IS NOT NULL;
$$ LANGUAGE SQL;

-- 리뷰 작성 시 평균 평점 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_room_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE talk_rooms
  SET avg_rating = calculate_room_rating(NEW.talk_room_id)
  WHERE id = NEW.talk_room_id;
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

-- ============================================
-- 검증 쿼리
-- ============================================

-- 버킷 확인
SELECT 'Storage Buckets' AS check_type, id, name, public FROM storage.buckets WHERE id IN ('room-media', 'user-avatars');

-- refunds 테이블 확인
SELECT 'Refunds Table' AS check_type, COUNT(*) AS count FROM refunds;

-- 컬럼 추가 확인
SELECT 'New Columns' AS check_type, table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_name = 'reviews' AND column_name = 'rating')
   OR (table_name = 'talk_rooms' AND column_name = 'avg_rating')
   OR (table_name = 'users' AND column_name = 'fcm_token');

-- 트리거 확인
SELECT 'Triggers' AS check_type, tgname AS trigger_name FROM pg_trigger WHERE tgname = 'trigger_update_room_rating';

-- 성공 메시지
SELECT '✅ All migrations completed successfully!' AS result;
