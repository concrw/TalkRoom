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
