-- Tighten users SELECT policy to require authenticated users explicitly
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
$function$;