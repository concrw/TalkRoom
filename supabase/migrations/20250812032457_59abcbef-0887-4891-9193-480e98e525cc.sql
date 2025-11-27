-- 1) USERS 테이블: 모든 사용자 조회 허용 정책 제거 후, 자기 자신만 조회 가능하도록 변경
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 2) 공개 프로필 함수 강화: 같은 토크룸 참가자 또는 본인만 조회 가능
CREATE OR REPLACE FUNCTION public.get_public_user_profile(_id uuid)
RETURNS TABLE(id uuid, name text, rating numeric, bio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id, u.name, u.rating, u.bio
  FROM public.users u
  WHERE u.id = _id
    AND (
      auth.uid() = _id
      OR EXISTS (
        SELECT 1
        FROM public.room_participants rp1
        JOIN public.room_participants rp2
          ON rp1.room_id = rp2.room_id
        WHERE rp1.user_id = auth.uid()
          AND rp2.user_id = _id
      )
    );
$function$;

-- 3) VOICE_SESSIONS: 참가자 또는 호스트만 조회 가능
DROP POLICY IF EXISTS "Anyone can view voice sessions" ON public.voice_sessions;

CREATE POLICY "Participants or host can view voice sessions"
ON public.voice_sessions
FOR SELECT
USING (
  host_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.room_participants rp
    WHERE rp.room_id = voice_sessions.talk_room_id
      AND rp.user_id = auth.uid()
  )
);

-- 4) TALK_ROOMS: 공개/비공개 분리
DROP POLICY IF EXISTS "Talk rooms are viewable by everyone" ON public.talk_rooms;

CREATE POLICY "Public talk rooms are viewable by everyone"
ON public.talk_rooms
FOR SELECT
USING (is_public = true);

CREATE POLICY "Hosts and participants can view their rooms"
ON public.talk_rooms
FOR SELECT
USING (
  (host_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.room_participants rp
    WHERE rp.room_id = talk_rooms.id
      AND rp.user_id = auth.uid()
  )
);
