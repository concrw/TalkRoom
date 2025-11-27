-- Ensure clients can call the RPC from the browser
GRANT EXECUTE ON FUNCTION public.seed_full_samples(uuid) TO anon, authenticated;