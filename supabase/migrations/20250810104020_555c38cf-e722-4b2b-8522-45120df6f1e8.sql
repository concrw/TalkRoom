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
