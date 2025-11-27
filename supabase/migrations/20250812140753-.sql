-- 1) insert_notification 함수를 SECURITY INVOKER로 설정
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT n.nspname, p.proname, oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'insert_notification'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SECURITY INVOKER', rec.nspname, rec.proname, rec.args);
  END LOOP;
END $$;

-- 2) chat_messages 테이블 SELECT 정책 정리 및 강화
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    -- RLS 활성화
    EXECUTE 'ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY';

    -- 기존 동일 이름의 정책이 있으면 제거
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'chat_messages' 
        AND policyname = 'Users can read messages in their rooms'
    ) THEN
      EXECUTE 'DROP POLICY "Users can read messages in their rooms" ON public.chat_messages';
    END IF;

    -- 참여중인 방의 메시지만 조회 가능 (또는 본인 메시지)
    EXECUTE $SQL$
      CREATE POLICY "Users can read messages in their rooms"
      ON public.chat_messages
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL AND (
          user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.room_participants rp
            WHERE rp.room_id = public.chat_messages.room_id
              AND rp.user_id = auth.uid()
          )
        )
      );
    $SQL$;
  END IF;
END $$;

-- 3) 2초당 1건 레이트리밋 트리거 추가
CREATE OR REPLACE FUNCTION public.chat_messages_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.chat_messages m
    WHERE m.user_id = NEW.user_id
      AND m.created_at > now() - interval '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Rate limit exceeded: please wait before sending another message';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'chat_messages_rate_limit_trigger'
    ) THEN
      EXECUTE $SQL$
        CREATE TRIGGER chat_messages_rate_limit_trigger
        BEFORE INSERT ON public.chat_messages
        FOR EACH ROW
        EXECUTE FUNCTION public.chat_messages_rate_limit();
      $SQL$;
    END IF;
  END IF;
END $$;

-- 4) 호스트가 본인 토크룸의 리뷰를 조회할 수 있는 정책 추가
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL AND to_regclass('public.rooms') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';

    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'reviews' 
        AND policyname = 'Hosts can view reviews of their rooms'
    ) THEN
      EXECUTE 'DROP POLICY "Hosts can view reviews of their rooms" ON public.reviews';
    END IF;

    EXECUTE $SQL$
      CREATE POLICY "Hosts can view reviews of their rooms"
      ON public.reviews
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.rooms r
          WHERE r.id = public.reviews.room_id
            AND r.host_id = auth.uid()
        )
      );
    $SQL$;
  END IF;
END $$;