-- daily_logs.talk_room_id를 nullable로 변경
DO $$
BEGIN
  ALTER TABLE daily_logs ALTER COLUMN talk_room_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- feed_posts에 unique constraint 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_posts_unique
ON feed_posts(user_id, talk_room_id, type)
WHERE talk_room_id IS NOT NULL;
