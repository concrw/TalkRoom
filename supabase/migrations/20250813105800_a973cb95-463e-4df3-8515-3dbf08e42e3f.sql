-- Fix ORDER BY created_at reference inside UNION subquery in seed_full_samples
-- Ensure host is included and listed first without referencing non-selected columns
CREATE OR REPLACE FUNCTION public.seed_full_samples(_host_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- rooms
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; r5 uuid;
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid;
  u_ids uuid[];
  u_count int;
  i int;
  msg_count int;
  p_count int;
  rev_count int;
  post_count int;
  like_count int;
  idx int;
BEGIN
  -- Ensure the host exists in public.users (FK-safe since host exists in auth.users)
  INSERT INTO public.users (id, name, bio)
  VALUES (_host_id, '호스트', '시드 생성자')
  ON CONFLICT (id) DO NOTHING;

  -- Build user pool from existing users (including host), host first
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO u_ids
  FROM (
    SELECT id
    FROM public.users
    ORDER BY CASE WHEN id = _host_id THEN 0 ELSE 1 END, created_at DESC
    LIMIT 50
  ) AS t;

  u_count := array_length(u_ids, 1);
  IF u_count IS NULL OR u_count = 0 THEN
    u_ids := ARRAY[_host_id];
    u_count := 1;
  END IF;

  -- Insert talk rooms
  INSERT INTO public.talk_rooms (
    title, description, media_url, media_type, price_cents, price_currency,
    capacity, keywords, replay_available, starts_at, host_id, is_public
  )
  VALUES
    ('아토믹 해빗: 작은 변화의 놀라운 힘','습관 형성의 과학을 통해 인생을 바꿔보세요','제임스 클리어 - 아토믹 해빗','book',1500000,'KRW',8,ARRAY['습관형성','자기계발','꾸준함'],true, now() - interval '30 minutes', _host_id, true),
    ('미라클 모닝: 기적의 아침 6시간','새벽 6시, 인생이 바뀌는 시간','할 엘로드 - 미라클 모닝','book',1200000,'KRW',6,ARRAY['아침루틴','명상','운동'],false, now() + interval '1 day', _host_id, true),
    ('TED: 성공하는 사람들의 비밀','세계적 리더들의 성공 비결을 함께 분석해요','TED 영상 모음집','video',1000000,'KRW',10,ARRAY['리더십','동기부여','커리어'],true, now() + interval '2 days', _host_id, true),
    ('사피엔스: 인류 문명의 역사','인류의 기원을 탐구하고 현재를 이해하기','유발 하라리 - 사피엔스','book',1800000,'KRW',12,ARRAY['역사','인문학','문명'],false, now() - interval '10 days', _host_id, true),
    ('데일 카네기: 인간관계론','사람을 얻는 방법과 영향력의 기술','데일 카네기','book',900000,'KRW',9,ARRAY['커뮤니케이션','자기계발','관계'],false, now() + interval '3 days', _host_id, true)
  RETURNING id INTO r1, r2, r3, r4, r5;

  -- voice sessions (create for each room, only r1 is active/live)
  INSERT INTO public.voice_sessions (talk_room_id, host_id, is_active, started_at)
  VALUES (r1, _host_id, true, now() - interval '20 minutes') RETURNING id INTO s1;

  INSERT INTO public.voice_sessions (talk_room_id, host_id, is_active, started_at, ended_at)
  VALUES (r2, _host_id, false, now() - interval '1 hour', now() - interval '30 minutes') RETURNING id INTO s2;

  INSERT INTO public.voice_sessions (talk_room_id, host_id, is_active, started_at, ended_at)
  VALUES (r3, _host_id, false, now() - interval '1 hour', now() - interval '10 minutes') RETURNING id INTO s3;

  INSERT INTO public.voice_sessions (talk_room_id, host_id, is_active, started_at, ended_at)
  VALUES (r4, _host_id, false, now() - interval '9 days', now() - interval '9 days' + interval '2 hours') RETURNING id INTO s4;

  INSERT INTO public.voice_sessions (talk_room_id, host_id, is_active, started_at)
  VALUES (r5, _host_id, false, now() - interval '2 hours') RETURNING id INTO s5;

  -- participants (wrap index by available users)
  p_count := 5; -- r1
  FOR i IN 1..p_count LOOP
    idx := ((i-1) % u_count) + 1;
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r1, u_ids[idx], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r1, _host_id, 'joined');

  p_count := 4; -- r2, offset base 5
  FOR i IN 1..p_count LOOP
    idx := (((i-1)+5) % u_count) + 1;
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r2, u_ids[idx], 'joined');
  END LOOP;

  p_count := 6; -- r3, offset base 2
  FOR i IN 1..p_count LOOP
    idx := (((i-1)+2) % u_count) + 1;
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r3, u_ids[idx], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r3, _host_id, 'joined');

  p_count := 7; -- r4, no offset
  FOR i IN 1..p_count LOOP
    idx := ((i-1) % u_count) + 1;
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r4, u_ids[idx], 'joined');
  END LOOP;

  p_count := 3; -- r5, offset base 8
  FOR i IN 1..p_count LOOP
    idx := (((i-1)+8) % u_count) + 1;
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r5, u_ids[idx], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r5, _host_id, 'joined');

  -- reviews (wrap indexing similarly)
  rev_count := 4; -- r1
  FOR i IN 1..rev_count LOOP
    idx := ((i-1) % u_count) + 1;
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r1, u_ids[idx], concat('정말 유익했어요! ', i));
  END LOOP;

  rev_count := 3; -- r2, offset base 5
  FOR i IN 1..rev_count LOOP
    idx := (((i-1)+5) % u_count) + 1;
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r2, u_ids[idx], concat('아침 루틴에 큰 도움이 되었어요. ', i));
  END LOOP;

  rev_count := 5; -- r3, offset base 2
  FOR i IN 1..rev_count LOOP
    idx := (((i-1)+2) % u_count) + 1;
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r3, u_ids[idx], concat('영감이 되었어요. ', i));
  END LOOP;

  rev_count := 4; -- r4
  FOR i IN 1..rev_count LOOP
    idx := ((i-1) % u_count) + 1;
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r4, u_ids[idx], concat('역사에 대한 시야가 넓어졌습니다. ', i));
  END LOOP;

  rev_count := 3; -- r5, offset base 8
  FOR i IN 1..rev_count LOOP
    idx := (((i-1)+8) % u_count) + 1;
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r5, u_ids[idx], concat('인간관계 팁이 실전적이에요. ', i));
  END LOOP;

  -- training courses (for host and some participants)
  INSERT INTO public.training_courses (user_id, talk_room_id, total_days, course_data, start_date)
  VALUES 
    (_host_id, r1, 21, '{"title":"습관 21일 챌린지"}'::jsonb, CURRENT_DATE),
    (u_ids[1], r1, 21, '{"title":"습관 21일 챌린지"}'::jsonb, CURRENT_DATE - 1),
    (u_ids[3 % GREATEST(u_count,1) + 1], r3, 14, '{"title":"성공 루틴 2주"}'::jsonb, CURRENT_DATE - 2),
    (u_ids[5 % GREATEST(u_count,1) + 1], r4, 30, '{"title":"사피엔스 심화"}'::jsonb, CURRENT_DATE - 10);

  -- daily logs (a few entries)
  INSERT INTO public.daily_logs (user_id, talk_room_id, day_number, log_date, morning_promise, evening_review)
  VALUES
    (_host_id, r1, 1, CURRENT_DATE, '오늘 10분 운동', '실천 완료! 상쾌해요.'),
    (_host_id, r1, 2, CURRENT_DATE - 1, '커피 줄이기', '실패했지만 내일 다시.'),
    (u_ids[1], r1, 1, CURRENT_DATE - 1, '명상 5분', '어려웠지만 도전!'),
    (u_ids[(3 % GREATEST(u_count,1)) + 1], r3, 1, CURRENT_DATE - 2, 'TED 강연 하나 보기', '메모와 함께 봤어요.'),
    (u_ids[(5 % GREATEST(u_count,1)) + 1], r4, 1, CURRENT_DATE - 9, '사피엔스 20쪽 읽기', '완독의 길이 보입니다.');

  -- Temporarily disable chat rate-limit triggers to bulk insert sample chats
  EXECUTE 'ALTER TABLE public.chat_messages DISABLE TRIGGER ALL';

  -- chat messages (10-15 per room)
  msg_count := 12; -- r1
  FOR i IN 1..msg_count LOOP
    idx := ((i-1) % u_count) + 1;
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s1, u_ids[idx], 'text', concat('Atomic Habits 채팅 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 10; -- r2
  FOR i IN 1..msg_count LOOP
    idx := (((i-1)+2) % u_count) + 1;
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s2, u_ids[idx], 'text', concat('Miracle Morning 질문 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 11; -- r3
  FOR i IN 1..msg_count LOOP
    idx := (((i-1)+4) % u_count) + 1;
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s3, u_ids[idx], 'text', concat('TED 토론 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 15; -- r4
  FOR i IN 1..msg_count LOOP
    idx := (((i-1)+6) % u_count) + 1;
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s4, u_ids[idx], 'text', concat('사피엔스 생각 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 10; -- r5
  FOR i IN 1..msg_count LOOP
    idx := (((i-1)+8) % u_count) + 1;
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s5, u_ids[idx], 'text', concat('카네기 팁 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  EXECUTE 'ALTER TABLE public.chat_messages ENABLE TRIGGER ALL';

  -- community feed posts (10) with mixed types and likes
  post_count := 10;
  FOR i IN 1..post_count LOOP
    idx := (((i*3) - 1) % u_count) + 1;
    INSERT INTO public.feed_posts (user_id, type, content, talk_room_id, is_public)
    VALUES (
      u_ids[idx],
      CASE WHEN i % 3 = 1 THEN 'review' WHEN i % 3 = 2 THEN 'daily_promise' ELSE 'training_complete' END,
      concat('커뮤니티 샘플 글 ', i),
      CASE WHEN i % 2 = 0 THEN r1 ELSE r3 END,
      true
    );
  END LOOP;

  -- likes for the recent posts
  FOR i IN 1..post_count LOOP
    like_count := 3 + (i % 4);
    FOR p_count IN 1..like_count LOOP
      idx := (((p_count+i) - 1) % u_count) + 1;
      INSERT INTO public.post_likes (user_id, post_id)
      SELECT u_ids[idx], fp.id
      FROM public.feed_posts fp
      ORDER BY fp.created_at DESC
      OFFSET i-1 LIMIT 1;
    END LOOP;
  END LOOP;

  -- notifications: training/chat/system x5 for current user
  FOR i IN 1..5 LOOP
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (_host_id, 'training', concat('훈련 알림 ', i), '오늘의 훈련을 완료해보세요!');
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (_host_id, 'chat', concat('채팅 알림 ', i), '새로운 메시지가 도착했습니다.');
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (_host_id, 'system', concat('시스템 알림 ', i), '서비스 점검 안내');
  END LOOP;

END;
$function$;

-- Ensure client roles can execute
GRANT EXECUTE ON FUNCTION public.seed_full_samples(uuid) TO anon, authenticated;