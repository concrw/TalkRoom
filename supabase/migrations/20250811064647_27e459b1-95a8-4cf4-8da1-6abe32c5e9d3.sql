-- Community feed schema
DO $$ BEGIN
  CREATE TYPE public.post_type AS ENUM ('review','daily_promise','training_complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talk_room_id uuid NULL,
  type public.post_type NOT NULL,
  content text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_posts_unique_per_type UNIQUE (user_id, talk_room_id, type)
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Public can read public posts
CREATE POLICY IF NOT EXISTS "Public can read public feed posts"
ON public.feed_posts
FOR SELECT
USING (is_public = true);

-- Owners manage their own posts
CREATE POLICY IF NOT EXISTS "Users can insert their feed posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their feed posts"
ON public.feed_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their feed posts"
ON public.feed_posts
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_feed_posts_public_created ON public.feed_posts (is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type_public_created ON public.feed_posts (type, is_public, created_at DESC);

DROP TRIGGER IF EXISTS update_feed_posts_updated_at ON public.feed_posts;
CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Likes table and triggers to maintain counter
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_unique UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own likes"
ON public.post_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can like posts"
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can unlike their likes"
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger function to sync likes_count
CREATE OR REPLACE FUNCTION public.sync_feed_post_likes()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS post_likes_ai ON public.post_likes;
CREATE TRIGGER post_likes_ai
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_feed_post_likes();

DROP TRIGGER IF EXISTS post_likes_ad ON public.post_likes;
CREATE TRIGGER post_likes_ad
AFTER DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_feed_post_likes();

-- Realtime for feed posts (optional but useful)
ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feed_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
  END IF;
END $$;