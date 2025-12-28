-- Storage buckets 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('room-media', 'room-media', true),
  ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 정책들은 이미 대시보드에서 생성되었으므로 스킵
-- 필요시 대시보드에서 수동으로 추가
