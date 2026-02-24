-- Migration: RPC to resolve username -> profile (bypasses RLS, case-insensitive)
-- Eliminates direct profiles SELECT from app code.

CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  bio text,
  disputes_raised integer,
  disputes_won integer,
  disputes_lost integer,
  disputes_conceded integer,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.bio, p.disputes_raised, p.disputes_won, p.disputes_lost, p.disputes_conceded, p.created_at
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text) TO authenticated;
