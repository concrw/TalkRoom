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
