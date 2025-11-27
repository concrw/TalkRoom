-- Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_current_user_participant(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = _room_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_host_of(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.talk_rooms
    WHERE id = _room_id AND host_id = auth.uid()
  );
$$;

-- Break circular references in policies
-- talk_rooms: replace participant/host view policy to use helper functions
DROP POLICY IF EXISTS "Hosts and participants can view their rooms" ON public.talk_rooms;
CREATE POLICY "Hosts and participants can view their rooms"
ON public.talk_rooms
FOR SELECT
USING (
  public.is_current_user_host_of(id)
  OR public.is_current_user_participant(id)
);

-- room_participants: avoid referencing talk_rooms directly
DROP POLICY IF EXISTS "Participants or hosts can view participants" ON public.room_participants;
CREATE POLICY "Participants or hosts can view participants"
ON public.room_participants
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_current_user_host_of(room_id)
);

DROP POLICY IF EXISTS "Participants or hosts can update participation" ON public.room_participants;
CREATE POLICY "Participants or hosts can update participation"
ON public.room_participants
FOR UPDATE
USING (
  auth.uid() = user_id OR public.is_current_user_host_of(room_id)
);

DROP POLICY IF EXISTS "Participants or hosts can leave/remove participation" ON public.room_participants;
CREATE POLICY "Participants or hosts can leave/remove participation"
ON public.room_participants
FOR DELETE
USING (
  auth.uid() = user_id OR public.is_current_user_host_of(room_id)
);
