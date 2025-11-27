-- Voice chat schema for talk rooms
-- 1) chat_message_type enum
DO $$
BEGIN
  CREATE TYPE public.chat_message_type AS ENUM ('text', 'cheer', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) voice_sessions table
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_room_id uuid NOT NULL,
  host_id uuid NOT NULL,
  speakers uuid[] NOT NULL DEFAULT '{}',
  queue uuid[] NOT NULL DEFAULT '{}',
  participants_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active session per talk room
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_sessions_active_per_room
ON public.voice_sessions (talk_room_id)
WHERE (is_active);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for voice_sessions
DO $$
BEGIN
  -- SELECT: anyone can view sessions (rooms are public)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'Anyone can view voice sessions'
  ) THEN
    CREATE POLICY "Anyone can view voice sessions"
    ON public.voice_sessions
    FOR SELECT
    USING (true);
  END IF;

  -- INSERT: only host can create a session
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'Host can insert voice sessions'
  ) THEN
    CREATE POLICY "Host can insert voice sessions"
    ON public.voice_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);
  END IF;

  -- UPDATE: only host can update the session
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'Host can update voice sessions'
  ) THEN
    CREATE POLICY "Host can update voice sessions"
    ON public.voice_sessions
    FOR UPDATE
    USING (auth.uid() = host_id);
  END IF;

  -- DELETE: only host can delete the session
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'Host can delete voice sessions'
  ) THEN
    CREATE POLICY "Host can delete voice sessions"
    ON public.voice_sessions
    FOR DELETE
    USING (auth.uid() = host_id);
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_voice_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_voice_sessions_updated_at
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text,
  type public.chat_message_type NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages (session_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
DO $$
BEGIN
  -- SELECT: anyone can read chat in the room
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Chat messages are viewable by everyone'
  ) THEN
    CREATE POLICY "Chat messages are viewable by everyone"
    ON public.chat_messages
    FOR SELECT
    USING (true);
  END IF;

  -- INSERT: only the author can insert their message
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Users can insert their chat messages'
  ) THEN
    CREATE POLICY "Users can insert their chat messages"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- DELETE: only the author can delete their message
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'Users can delete their chat messages'
  ) THEN
    CREATE POLICY "Users can delete their chat messages"
    ON public.chat_messages
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger for chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_messages_updated_at'
  ) THEN
    CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
