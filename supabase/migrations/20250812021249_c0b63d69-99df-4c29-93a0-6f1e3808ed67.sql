-- Restrict public access to users table and add a safe public profile function

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
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO anon, authenticated;