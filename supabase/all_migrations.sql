-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

-- Users (profiles) table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  level integer not null default 1,
  streak_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Talk rooms table
create table if not exists public.talk_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  capacity integer not null default 50,
  price_cents integer not null default 0,
  price_currency text not null default 'KRW',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.talk_rooms enable row level security;

-- Room participants table
create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.talk_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'joined',
  unique (room_id, user_id)
);

alter table public.room_participants enable row level security;

-- Indexes
create index if not exists idx_room_participants_room_id on public.room_participants (room_id);
create index if not exists idx_room_participants_user_id on public.room_participants (user_id);
create index if not exists idx_talk_rooms_host_id on public.talk_rooms (host_id);
create index if not exists idx_talk_rooms_starts_at on public.talk_rooms (starts_at);

-- updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists update_talk_rooms_updated_at on public.talk_rooms;
create trigger update_talk_rooms_updated_at
before update on public.talk_rooms
for each row execute function public.update_updated_at_column();

-- RLS Policies
-- Users
create policy "Users are viewable by everyone"
on public.users
for select
using (true);

create policy "Users can insert their own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.users
for update
to authenticated
using (auth.uid() = id);

create policy "Users can delete their own profile"
on public.users
for delete
to authenticated
using (auth.uid() = id);

-- Talk rooms
create policy "Talk rooms are viewable by everyone"
on public.talk_rooms
for select
using (true);

create policy "Hosts can create their rooms"
on public.talk_rooms
for insert
to authenticated
with check (auth.uid() = host_id);

create policy "Hosts can update their rooms"
on public.talk_rooms
for update
to authenticated
using (auth.uid() = host_id);

create policy "Hosts can delete their rooms"
on public.talk_rooms
for delete
to authenticated
using (auth.uid() = host_id);

-- Room participants
create policy "Participants or hosts can view participants"
on public.room_participants
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.talk_rooms tr
    where tr.id = room_id and tr.host_id = auth.uid()
  )
);

create policy "Users can join a room as themselves"
on public.room_participants
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Participants or hosts can update participation"
on public.room_participants
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.talk_rooms tr
    where tr.id = room_id and tr.host_id = auth.uid()
  )
);

create policy "Participants or hosts can leave/remove participation"
on public.room_participants
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.talk_rooms tr
    where tr.id = room_id and tr.host_id = auth.uid()
  )
);
-- Fix linter: set search_path and security definer on timestamp trigger function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
-- Extend talk_rooms with media and keywords
alter table public.talk_rooms
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists replay_available boolean not null default false;

-- Add CHECK for media_type safely
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'talk_rooms_media_type_check'
  ) then
    alter table public.talk_rooms
      add constraint talk_rooms_media_type_check
      check (media_type is null or media_type in ('book','video'));
  end if;
end $$;

-- Extend users with profile fields
alter table public.users
  add column if not exists bio text,
  add column if not exists rating numeric(2,1) not null default 5.0;

-- Favorites table
create table if not exists public.room_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.talk_rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, room_id)
);

alter table public.room_favorites enable row level security;

-- RLS policies for favorites
create policy if not exists "Users can view their own favorites"
  on public.room_favorites for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can add their own favorites"
  on public.room_favorites for insert to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Users can remove their own favorites"
  on public.room_favorites for delete to authenticated
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_room_favorites_user_id on public.room_favorites(user_id);
create index if not exists idx_room_favorites_room_id on public.room_favorites(room_id);
-- Re-apply favorites policies without IF NOT EXISTS (Postgres doesn't support it)
-- Safe drops
drop policy if exists "Users can view their own favorites" on public.room_favorites;
drop policy if exists "Users can add their own favorites" on public.room_favorites;
drop policy if exists "Users can remove their own favorites" on public.room_favorites;

-- Create policies
create policy "Users can view their own favorites"
  on public.room_favorites for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.room_favorites for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.room_favorites for delete to authenticated
  using (auth.uid() = user_id);
-- Ensure talk_rooms extended columns exist
alter table public.talk_rooms
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists keywords text[] not null default '{}',
  add column if not exists replay_available boolean not null default false;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'talk_rooms_media_type_check'
  ) then
    alter table public.talk_rooms
      add constraint talk_rooms_media_type_check
      check (media_type is null or media_type in ('book','video'));
  end if;
end $$;

-- Extend users with profile fields
alter table public.users
  add column if not exists bio text,
  add column if not exists rating numeric(2,1) not null default 5.0;

-- Create favorites table
create table if not exists public.room_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.talk_rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, room_id)
);

alter table public.room_favorites enable row level security;

-- Create policies (drop first just in case of partial runs)
drop policy if exists "Users can view their own favorites" on public.room_favorites;
drop policy if exists "Users can add their own favorites" on public.room_favorites;
drop policy if exists "Users can remove their own favorites" on public.room_favorites;

create policy "Users can view their own favorites"
  on public.room_favorites for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.room_favorites for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.room_favorites for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_room_favorites_user_id on public.room_favorites(user_id);
create index if not exists idx_room_favorites_room_id on public.room_favorites(room_id);
-- 1) Create reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  talk_room_id uuid not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_user_room unique (user_id, talk_room_id)
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Policies: users can manage their own reviews, and must be participants to insert
create policy if not exists "Users can view their own reviews"
  on public.reviews
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own review if participant"
  on public.reviews
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_participants rp
      where rp.room_id = reviews.talk_room_id
        and rp.user_id = auth.uid()
    )
  );

create policy if not exists "Users can update their own reviews"
  on public.reviews
  for update
  using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger if not exists update_reviews_updated_at
before update on public.reviews
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_reviews_talk_room_id on public.reviews (talk_room_id);
create index if not exists idx_reviews_user_id on public.reviews (user_id);

-- 2) Add review_completed to room_participants
alter table public.room_participants
  add column if not exists review_completed boolean not null default false;-- 1) Create reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  talk_room_id uuid not null,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_unique_user_room unique (user_id, talk_room_id)
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Recreate policies safely (DROP then CREATE)
drop policy if exists "Users can view their own reviews" on public.reviews;
create policy "Users can view their own reviews"
  on public.reviews
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own review if participant" on public.reviews;
create policy "Users can insert their own review if participant"
  on public.reviews
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_participants rp
      where rp.room_id = reviews.talk_room_id
        and rp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews"
  on public.reviews
  for update
  using (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
create trigger update_reviews_updated_at
before update on public.reviews
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_reviews_talk_room_id on public.reviews (talk_room_id);
create index if not exists idx_reviews_user_id on public.reviews (user_id);

-- 2) Add review_completed to room_participants
alter table public.room_participants
  add column if not exists review_completed boolean not null default false;-- 1) Add training_weeks to talk_rooms
ALTER TABLE public.talk_rooms
ADD COLUMN IF NOT EXISTS training_weeks integer NOT NULL DEFAULT 3;

-- Restrict to allowed values (1,2,3,5,9) using CHECK (not time-based)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'talk_rooms_training_weeks_allowed'
  ) THEN
    ALTER TABLE public.talk_rooms
    ADD CONSTRAINT talk_rooms_training_weeks_allowed
    CHECK (training_weeks IN (1,2,3,5,9));
  END IF;
END $$;

-- 2) Add course_completed to room_participants
ALTER TABLE public.room_participants
ADD COLUMN IF NOT EXISTS course_completed boolean NOT NULL DEFAULT false;

-- 3) Create training_courses table
CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talk_room_id uuid NOT NULL,
  course_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_days integer NOT NULL,
  start_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id)
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

-- Policies for training_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can view their own training courses'
  ) THEN
    CREATE POLICY "Users can view their own training courses"
    ON public.training_courses
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can create their own training courses'
  ) THEN
    CREATE POLICY "Users can create their own training courses"
    ON public.training_courses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can update their own training courses'
  ) THEN
    CREATE POLICY "Users can update their own training courses"
    ON public.training_courses
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='training_courses' AND policyname='Users can delete their own training courses'
  ) THEN
    CREATE POLICY "Users can delete their own training courses"
    ON public.training_courses
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_courses_updated_at'
  ) THEN
    CREATE TRIGGER update_training_courses_updated_at
    BEFORE UPDATE ON public.training_courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for training_courses
CREATE INDEX IF NOT EXISTS idx_training_courses_user ON public.training_courses (user_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_room ON public.training_courses (talk_room_id);

-- 4) Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talk_room_id uuid NOT NULL,
  day_number integer NOT NULL,
  morning_promise text,
  evening_review text,
  log_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, talk_room_id, day_number)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- RLS for daily_logs: users manage own logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can view their own daily logs'
  ) THEN
    CREATE POLICY "Users can view their own daily logs"
    ON public.daily_logs
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can insert their own daily logs'
  ) THEN
    CREATE POLICY "Users can insert their own daily logs"
    ON public.daily_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can update their own daily logs'
  ) THEN
    CREATE POLICY "Users can update their own daily logs"
    ON public.daily_logs
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='daily_logs' AND policyname='Users can delete their own daily logs'
  ) THEN
    CREATE POLICY "Users can delete their own daily logs"
    ON public.daily_logs
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger for updated_at on daily_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_logs_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_logs_updated_at
    BEFORE UPDATE ON public.daily_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for daily_logs
CREATE INDEX IF NOT EXISTS idx_daily_logs_room ON public.daily_logs (talk_room_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_room_day ON public.daily_logs (talk_room_id, day_number);

-- 5) RPC to safely share ONLY evening_review with room participants
CREATE OR REPLACE FUNCTION public.get_evening_logs(_room_id uuid)
RETURNS TABLE (
  user_id uuid,
  day_number integer,
  evening_review text,
  log_date date,
  created_at timestamptz
) AS $$
  SELECT dl.user_id, dl.day_number, dl.evening_review, dl.log_date, dl.created_at
  FROM public.daily_logs dl
  WHERE dl.talk_room_id = _room_id
    AND dl.evening_review IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = _room_id AND rp.user_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_evening_logs(uuid) TO authenticated;
-- Notifications schema
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('nudge','chat','system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_isread_created
ON public.notifications (user_id, is_read, created_at DESC);

DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to insert a notification for any user
CREATE OR REPLACE FUNCTION public.insert_notification(
  _user_id uuid,
  _type public.notification_type,
  _title text,
  _message text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (_user_id, _type, _title, _message);
END;
$fn$;

REVOKE ALL ON FUNCTION public.insert_notification(uuid, public.notification_type, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_notification(uuid, public.notification_type, text, text) TO authenticated;

-- Realtime settings
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;-- Community feed schema
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
END $$;-- Community feed schema (retry without IF NOT EXISTS on policies)
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

CREATE POLICY "Public can read public feed posts"
ON public.feed_posts
FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can insert their feed posts"
ON public.feed_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their feed posts"
ON public.feed_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their feed posts"
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

CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_unique UNIQUE (user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
ON public.post_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can like posts"
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their likes"
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);

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

ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'feed_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
  END IF;
END $$;-- Fix linter: set search_path on trigger function
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
$$;-- Voice chat schema for talk rooms
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
-- Add avatar_url column to users for storing Google profile image
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;-- Restrict public access to users table and add a safe public profile function

-- Ensure RLS is enabled (should already be, but re-assert)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive public SELECT policy if it exists
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;

-- Allow SELECT only to authenticated users
CREATE POLICY "Authenticated users can view users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Create a SECURITY DEFINER function to expose minimal, non-sensitive fields publicly
CREATE OR REPLACE FUNCTION public.get_public_user_profile(_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  rating numeric,
  bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT u.id, u.name, u.rating, u.bio
  FROM public.users u
  WHERE u.id = _id;
$$;

-- Allow both anonymous and authenticated clients to execute the function
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO anon, authenticated;-- Secure chat_messages: restrict reads to participants/host or author

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
-- Tighten users SELECT policy to require authenticated users explicitly
ALTER POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Harden RPC to explicitly require authenticated callers
CREATE OR REPLACE FUNCTION public.get_public_user_profile(_id uuid)
 RETURNS TABLE(id uuid, name text, rating numeric, bio text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id, u.name, u.rating, u.bio
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND u.id = _id
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
$function$;-- Tighten users SELECT policy to require authenticated users explicitly
ALTER POLICY "Users can view their own profile" ON public.users
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Harden RPC to explicitly require authenticated callers
CREATE OR REPLACE FUNCTION public.get_public_user_profile(_id uuid)
 RETURNS TABLE(id uuid, name text, rating numeric, bio text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id, u.name, u.rating, u.bio
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND u.id = _id
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
$function$;-- 1) insert_notification 함수를 SECURITY INVOKER로 설정
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
END $$;-- Set insert_notification to SECURITY INVOKER explicitly
ALTER FUNCTION public.insert_notification(
  _user_id uuid,
  _type notification_type,
  _title text,
  _message text
) SECURITY INVOKER;

-- Attach rate limit trigger to chat_messages using existing function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'chat_messages_rate_limit_trigger'
  ) THEN
    EXECUTE $SQL$
      CREATE TRIGGER chat_messages_rate_limit_trigger
      BEFORE INSERT ON public.chat_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_chat_message_rate_limit();
    $SQL$;
  END IF;
END $$;-- Create a comprehensive seed function to populate sample data across multiple tables
-- SECURITY DEFINER to bypass RLS safely within the function
CREATE OR REPLACE FUNCTION public.seed_full_samples(_host_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- rooms
  r1 uuid; r2 uuid; r3 uuid; r4 uuid; r5 uuid;
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid;
  u_ids uuid[];
  i int;
  msg_count int;
  p_count int;
  rev_count int;
  post_count int;
  like_count int;
BEGIN
  -- Create sample users (12) if not already present
  u_ids := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  FOR i IN 1..array_length(u_ids,1) LOOP
    INSERT INTO public.users (id, name, bio, avatar_url)
    VALUES (u_ids[i], concat('게스트', i), '샘플 사용자', NULL)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

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

  -- participants (3-7 per room), include host in some rooms
  p_count := 5; -- r1
  FOR i IN 1..p_count LOOP
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r1, u_ids[i], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r1, _host_id, 'joined');

  p_count := 4; -- r2
  FOR i IN 6..(6+p_count-1) LOOP
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r2, u_ids[i], 'joined');
  END LOOP;

  p_count := 6; -- r3
  FOR i IN 3..(3+p_count-1) LOOP
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r3, u_ids[i], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r3, _host_id, 'joined');

  p_count := 7; -- r4
  FOR i IN 1..p_count LOOP
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r4, u_ids[i], 'joined');
  END LOOP;

  p_count := 3; -- r5
  FOR i IN 9..(9+p_count-1) LOOP
    INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r5, u_ids[i], 'joined');
  END LOOP;
  INSERT INTO public.room_participants (room_id, user_id, status) VALUES (r5, _host_id, 'joined');

  -- reviews (3-5 each)
  rev_count := 4; -- r1
  FOR i IN 1..rev_count LOOP
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r1, u_ids[i], concat('정말 유익했어요! ', i));
  END LOOP;

  rev_count := 3; -- r2
  FOR i IN 6..(6+rev_count-1) LOOP
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r2, u_ids[i], concat('아침 루틴에 큰 도움이 되었어요. ', i));
  END LOOP;

  rev_count := 5; -- r3
  FOR i IN 3..(3+rev_count-1) LOOP
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r3, u_ids[i], concat('영감이 되었어요. ', i));
  END LOOP;

  rev_count := 4; -- r4
  FOR i IN 1..rev_count LOOP
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r4, u_ids[i], concat('역사에 대한 시야가 넓어졌습니다. ', i));
  END LOOP;

  rev_count := 3; -- r5
  FOR i IN 9..(9+rev_count-1) LOOP
    INSERT INTO public.reviews (talk_room_id, user_id, content)
    VALUES (r5, u_ids[i], concat('인간관계 팁이 실전적이에요. ', i));
  END LOOP;

  -- training courses (for host and some participants)
  INSERT INTO public.training_courses (user_id, talk_room_id, total_days, course_data, start_date)
  VALUES 
    (_host_id, r1, 21, '{"title":"습관 21일 챌린지"}'::jsonb, CURRENT_DATE),
    (u_ids[1], r1, 21, '{"title":"습관 21일 챌린지"}'::jsonb, CURRENT_DATE - 1),
    (u_ids[3], r3, 14, '{"title":"성공 루틴 2주"}'::jsonb, CURRENT_DATE - 2),
    (u_ids[5], r4, 30, '{"title":"사피엔스 심화"}'::jsonb, CURRENT_DATE - 10);

  -- daily logs (a few entries)
  INSERT INTO public.daily_logs (user_id, talk_room_id, day_number, log_date, morning_promise, evening_review)
  VALUES
    (_host_id, r1, 1, CURRENT_DATE, '오늘 10분 운동', '실천 완료! 상쾌해요.'),
    (_host_id, r1, 2, CURRENT_DATE - 1, '커피 줄이기', '실패했지만 내일 다시.'),
    (u_ids[1], r1, 1, CURRENT_DATE - 1, '명상 5분', '어려웠지만 도전!'),
    (u_ids[3], r3, 1, CURRENT_DATE - 2, 'TED 강연 하나 보기', '메모와 함께 봤어요.'),
    (u_ids[5], r4, 1, CURRENT_DATE - 9, '사피엔스 20쪽 읽기', '완독의 길이 보입니다.');

  -- Temporarily disable chat rate-limit triggers to bulk insert sample chats
  EXECUTE 'ALTER TABLE public.chat_messages DISABLE TRIGGER ALL';

  -- chat messages (10-15 per room)
  msg_count := 12; -- r1
  FOR i IN 1..msg_count LOOP
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s1, u_ids[(i % array_length(u_ids,1))+1], 'text', concat('Atomic Habits 채팅 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 10; -- r2
  FOR i IN 1..msg_count LOOP
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s2, u_ids[((i+2) % array_length(u_ids,1))+1], 'text', concat('Miracle Morning 질문 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 11; -- r3
  FOR i IN 1..msg_count LOOP
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s3, u_ids[((i+4) % array_length(u_ids,1))+1], 'text', concat('TED 토론 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 15; -- r4
  FOR i IN 1..msg_count LOOP
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s4, u_ids[((i+6) % array_length(u_ids,1))+1], 'text', concat('사피엔스 생각 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  msg_count := 10; -- r5
  FOR i IN 1..msg_count LOOP
    INSERT INTO public.chat_messages (session_id, user_id, type, message, created_at)
    VALUES (s5, u_ids[((i+8) % array_length(u_ids,1))+1], 'text', concat('카네기 팁 ', i), now() - (msg_count - i) * interval '3 seconds');
  END LOOP;

  EXECUTE 'ALTER TABLE public.chat_messages ENABLE TRIGGER ALL';

  -- community feed posts (10) with mixed types and likes
  post_count := 10;
  FOR i IN 1..post_count LOOP
    INSERT INTO public.feed_posts (user_id, type, content, talk_room_id, is_public)
    VALUES (
      u_ids[((i*3) % array_length(u_ids,1))+1],
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
      INSERT INTO public.post_likes (user_id, post_id)
      SELECT u_ids[((p_count+i) % array_length(u_ids,1))+1], fp.id
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
$$;-- Grant execute on RPC functions so the client can call them
GRANT EXECUTE ON FUNCTION public.seed_full_samples(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_evening_logs(uuid) TO authenticated, anon;
-- Update seed_full_samples to avoid FK violations by using existing users only
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

  -- Build user pool from existing profiles (including host)
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO u_ids
  FROM (
    SELECT _host_id AS id
    UNION ALL
    SELECT id FROM public.users WHERE id <> _host_id ORDER BY created_at DESC LIMIT 50
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
$function$;-- Helper functions to avoid RLS recursion
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
-- Ensure clients can call the RPC from the browser
GRANT EXECUTE ON FUNCTION public.seed_full_samples(uuid) TO anon, authenticated;-- Fix ORDER BY created_at reference inside UNION subquery in seed_full_samples
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