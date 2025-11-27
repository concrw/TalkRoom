-- Sample data for TALKROOM development and testing
-- Run this script after applying all migrations

-- Note: This script creates sample data for development purposes only
-- Do not run in production

-- Sample users (these will reference auth.users, so you need to create auth users first)
-- For now, we'll create talk rooms with placeholder host_id values

-- Sample Talk Rooms
INSERT INTO public.talk_rooms (
  id,
  host_id,
  title,
  description,
  media_type,
  media_url,
  keywords,
  starts_at,
  capacity,
  price_cents,
  price_currency,
  is_public,
  replay_available,
  training_weeks
) VALUES
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- Placeholder: replace with actual auth user ID
  '아토믹 해빗',
  '작은 습관의 힘으로 인생을 변화시키는 방법을 함께 배워봅시다. 제임스 클리어의 베스트셀러를 바탕으로 실천 가능한 습관 형성 전략을 7일간 집중적으로 훈련합니다.',
  'book',
  '/images/atomic-habits.jpg',
  ARRAY['습관', '자기계발', '실천'],
  NOW() + INTERVAL '2 days',
  8,
  1500000,
  'KRW',
  true,
  false,
  1
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '미라클 모닝',
  '아침 루틴으로 인생을 바꾸는 경험을 함께 해봅시다. 할 엘로드의 미라클 모닝 메소드를 활용해 6가지 핵심 습관을 체득합니다.',
  'book',
  '/images/miracle-morning.jpg',
  ARRAY['아침루틴', '생산성', '습관'],
  NOW() + INTERVAL '3 days',
  10,
  1200000,
  'KRW',
  true,
  true,
  1
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '사피엔스',
  '인류의 역사를 새로운 시각으로 바라보는 토크룸입니다. 유발 하라리의 통찰을 함께 나누며 우리 삶의 방향을 고민해봅니다.',
  'book',
  '/images/sapiens.jpg',
  ARRAY['역사', '인문학', '통찰'],
  NOW() + INTERVAL '5 days',
  12,
  1800000,
  'KRW',
  true,
  false,
  2
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '부의 추월차선',
  '젊어서 부자가 되는 전략을 배우는 토크룸입니다. 엠제이 드마코의 부의 공식을 실제로 적용해봅니다.',
  'book',
  '/images/millionaire-fastlane.jpg',
  ARRAY['재테크', '투자', '부자'],
  NOW() + INTERVAL '7 days',
  8,
  2000000,
  'KRW',
  true,
  true,
  2
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '데일 카네기 인간관계론',
  '사람의 마음을 움직이는 대화법을 배우는 토크룸입니다. 실전 연습을 통해 커뮤니케이션 능력을 향상시킵니다.',
  'book',
  '/images/how-to-win-friends.jpg',
  ARRAY['커뮤니케이션', '관계', '소통'],
  NOW() + INTERVAL '4 days',
  10,
  1400000,
  'KRW',
  true,
  false,
  1
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '1페이지 마케팅',
  '복잡한 마케팅을 단순하게 만드는 방법을 배웁니다. 도널드 밀러의 스토리브랜드 전략을 실제 비즈니스에 적용합니다.',
  'book',
  '/images/marketing-made-simple.jpg',
  ARRAY['마케팅', '브랜딩', '비즈니스'],
  NOW() + INTERVAL '6 days',
  15,
  1600000,
  'KRW',
  true,
  true,
  2
)
ON CONFLICT (id) DO NOTHING;

-- Sample Training Course Templates (will be used when users join rooms)
-- These are just examples and would typically be created when a user joins a room

COMMENT ON TABLE public.talk_rooms IS 'Sample data created for development. Replace placeholder host_id values with actual user IDs.';
