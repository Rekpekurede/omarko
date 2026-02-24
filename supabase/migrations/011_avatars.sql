-- Migration: Avatar support for profiles
-- Add avatar_url column. Create "avatars" bucket manually in Supabase Dashboard (Storage > New bucket, name: avatars, public: true).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RPC to return avatar_url
CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  bio text,
  avatar_url text,
  disputes_raised integer,
  disputes_won integer,
  disputes_lost integer,
  disputes_conceded integer,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.bio, p.avatar_url, p.disputes_raised, p.disputes_won, p.disputes_lost, p.disputes_conceded, p.created_at
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;
