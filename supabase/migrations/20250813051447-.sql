-- Grant execute on RPC functions so the client can call them
GRANT EXECUTE ON FUNCTION public.seed_full_samples(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_evening_logs(uuid) TO authenticated, anon;
