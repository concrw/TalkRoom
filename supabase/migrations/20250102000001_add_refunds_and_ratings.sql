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

-- refunds RLS 정책 (이미 존재하면 무시)
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Users can view their own refunds') THEN
    CREATE POLICY "Users can view their own refunds" ON refunds FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'Users can create refund requests') THEN
    CREATE POLICY "Users can create refund requests" ON refunds FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

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
