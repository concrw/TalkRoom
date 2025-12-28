-- TALKROOM Database Schema - Clean Migration
-- Run this in Supabase SQL Editor

-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  bio text,
  avatar_url text,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================
-- 2. TALK_ROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.talk_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  media_url text,
  media_type text,
  keywords text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  capacity integer NOT NULL DEFAULT 50,
  price_cents integer NOT NULL DEFAULT 0,
  price_currency text NOT NULL DEFAULT 'KRW',
  is_public boolean NOT NULL DEFAULT true,
  replay_available boolean NOT NULL DEFAULT false,
  training_weeks integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.talk_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public talk rooms are viewable by everyone" ON public.talk_rooms;
CREATE POLICY "Public talk rooms are viewable by everyone" ON public.talk_rooms
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Hosts can create their rooms" ON public.talk_rooms;
CREATE POLICY "Hosts can create their rooms" ON public.talk_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their rooms" ON public.talk_rooms;
CREATE POLICY "Hosts can update their rooms" ON public.talk_rooms
  FOR UPDATE TO authenticated USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can delete their rooms" ON public.talk_rooms;
CREATE POLICY "Hosts can delete their rooms" ON public.talk_rooms
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE INDEX IF NOT EXISTS idx_talk_rooms_host_id ON public.talk_rooms (host_id);
CREATE INDEX IF NOT EXISTS idx_talk_rooms_starts_at ON public.talk_rooms (starts_at);

-- ============================================
-- 3. ROOM_PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'joined',
  review_completed boolean NOT NULL DEFAULT false,
  course_completed boolean NOT NULL DEFAULT false,
  UNIQUE (room_id, user_id)
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their participations" ON public.room_participants;
CREATE POLICY "Users can view their participations" ON public.room_participants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_participants;
CREATE POLICY "Users can join rooms" ON public.room_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their participation" ON public.room_participants;
CREATE POLICY "Users can update their participation" ON public.room_participants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;
CREATE POLICY "Users can leave rooms" ON public.room_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.room_participants (room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON public.room_participants (user_id);

-- ============================================
-- 4. ROOM_FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.room_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, room_id)
);

ALTER TABLE public.room_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their favorites" ON public.room_favorites;
CREATE POLICY "Users can view their favorites" ON public.room_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON public.room_favorites;
CREATE POLICY "Users can add favorites" ON public.room_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON public.room_favorites;
CREATE POLICY "Users can remove favorites" ON public.room_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- 5. VOICE_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speakers uuid[] NOT NULL DEFAULT '{}',
  queue uuid[] NOT NULL DEFAULT '{}',
  participants_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_sessions_active ON public.voice_sessions (talk_room_id) WHERE (is_active);

DROP POLICY IF EXISTS "Anyone can view voice sessions" ON public.voice_sessions;
CREATE POLICY "Anyone can view voice sessions" ON public.voice_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Host can manage voice sessions" ON public.voice_sessions;
CREATE POLICY "Host can manage voice sessions" ON public.voice_sessions
  FOR ALL TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

-- ============================================
-- 6. CHAT_MESSAGES TABLE
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.chat_message_type AS ENUM ('text', 'cheer', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  type public.chat_message_type NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
CREATE POLICY "Users can send chat messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages (session_id, created_at DESC);

-- ============================================
-- 7. TRAINING_COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talk_room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  course_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_days integer NOT NULL,
  start_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id)
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their training courses" ON public.training_courses;
CREATE POLICY "Users can manage their training courses" ON public.training_courses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_training_courses_user ON public.training_courses (user_id);

-- ============================================
-- 8. DAILY_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talk_room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  morning_promise text,
  evening_review text,
  log_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id, day_number)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their daily logs" ON public.daily_logs;
CREATE POLICY "Users can manage their daily logs" ON public.daily_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_room ON public.daily_logs (talk_room_id);

-- ============================================
-- 9. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talk_room_id uuid NOT NULL REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their reviews" ON public.reviews;
CREATE POLICY "Users can manage their reviews" ON public.reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_room ON public.reviews (talk_room_id);

-- ============================================
-- 10. NOTIFICATIONS TABLE
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('nudge', 'chat', 'system', 'training');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their notifications" ON public.notifications;
CREATE POLICY "Users can manage their notifications" ON public.notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

-- ============================================
-- 11. FEED_POSTS TABLE (Community)
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.post_type AS ENUM ('review', 'daily_promise', 'training_complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talk_room_id uuid REFERENCES public.talk_rooms(id) ON DELETE CASCADE,
  type public.post_type NOT NULL,
  content text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public posts are viewable" ON public.feed_posts;
CREATE POLICY "Public posts are viewable" ON public.feed_posts
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can manage their posts" ON public.feed_posts;
CREATE POLICY "Users can manage their posts" ON public.feed_posts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feed_posts_public ON public.feed_posts (is_public, created_at DESC);

-- ============================================
-- 12. POST_LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view likes" ON public.post_likes;
CREATE POLICY "Users can view likes" ON public.post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FUNCTION FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_talk_rooms_updated_at ON public.talk_rooms;
CREATE TRIGGER update_talk_rooms_updated_at BEFORE UPDATE ON public.talk_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_sessions_updated_at ON public.voice_sessions;
CREATE TRIGGER update_voice_sessions_updated_at BEFORE UPDATE ON public.voice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_courses_updated_at ON public.training_courses;
CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER update_feed_posts_updated_at BEFORE UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- LIKES COUNT SYNC TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_feed_post_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_insert ON public.post_likes;
CREATE TRIGGER post_likes_insert AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_post_likes();

DROP TRIGGER IF EXISTS post_likes_delete ON public.post_likes;
CREATE TRIGGER post_likes_delete AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_feed_post_likes();

-- ============================================
-- PUBLIC PROFILE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.get_public_user_profile(_id uuid)
RETURNS TABLE(id uuid, name text, rating numeric, bio text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, u.rating, u.bio, u.avatar_url
  FROM public.users u
  WHERE u.id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO anon, authenticated;

-- ============================================
-- REALTIME SETUP
-- ============================================
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Done!
-- Schema created successfully.
