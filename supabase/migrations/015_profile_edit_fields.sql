-- Migration: Profile editable fields (display_name, location, website)
-- Run in Supabase SQL Editor.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- Ensure updated_at exists and trigger updates it
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update RPC to return new columns
CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  bio text,
  location text,
  website text,
  avatar_url text,
  disputes_raised integer,
  disputes_won integer,
  disputes_lost integer,
  disputes_conceded integer,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.bio, p.location, p.website, p.avatar_url,
         p.disputes_raised, p.disputes_won, p.disputes_lost, p.disputes_conceded,
         p.created_at, p.updated_at
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;

-- RPC for feed comment counts (avoids N+1)
CREATE OR REPLACE FUNCTION public.get_comment_counts_for_marks(p_mark_ids uuid[])
RETURNS TABLE (mark_id uuid, cnt bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.mark_id, COUNT(*)::bigint
  FROM public.comments c
  WHERE c.mark_id = ANY(p_mark_ids)
  GROUP BY c.mark_id
$$;
GRANT EXECUTE ON FUNCTION public.get_comment_counts_for_marks(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_comment_counts_for_marks(uuid[]) TO authenticated;
