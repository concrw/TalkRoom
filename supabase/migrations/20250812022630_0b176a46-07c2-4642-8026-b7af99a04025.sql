-- Secure chat_messages: restrict reads to participants/host or author

-- Ensure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive public read policy
DROP POLICY IF EXISTS "Chat messages are viewable by everyone" ON public.chat_messages;

-- Allow reads only to authenticated users who are either:
-- - the message author, OR
-- - a participant of the related room, OR
-- - the host of the related room
-- We support two mappings to be robust with existing data models:
--   A) chat_messages.session_id references voice_sessions.id, which maps to a talk_room via voice_sessions.talk_room_id
--   B) chat_messages.session_id directly references talk_rooms.id
CREATE POLICY "Participants and hosts can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  -- author can always view their own messages
  auth.uid() = user_id
  OR
  -- A) session -> voice_sessions -> talk_room: host or participant of that room
  EXISTS (
    SELECT 1
    FROM public.voice_sessions vs
    JOIN public.talk_rooms tr ON tr.id = vs.talk_room_id
    LEFT JOIN public.room_participants rp
      ON rp.room_id = vs.talk_room_id AND rp.user_id = auth.uid()
    WHERE vs.id = chat_messages.session_id
      AND (
        tr.host_id = auth.uid()
        OR rp.user_id IS NOT NULL
      )
  )
  OR
  -- B) session_id points directly to talk_rooms.id: host or participant of that room
  EXISTS (
    SELECT 1
    FROM public.talk_rooms tr
    LEFT JOIN public.room_participants rp
      ON rp.room_id = tr.id AND rp.user_id = auth.uid()
    WHERE tr.id = chat_messages.session_id
      AND (
        tr.host_id = auth.uid()
        OR rp.user_id IS NOT NULL
      )
  )
);
