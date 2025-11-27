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
  add column if not exists review_completed boolean not null default false;