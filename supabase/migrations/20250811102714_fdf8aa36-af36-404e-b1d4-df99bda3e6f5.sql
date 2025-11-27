-- Add avatar_url column to users for storing Google profile image
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;