-- Migration: vote persistence + comment_count sync
-- Safe to run multiple times.

-- =====================================================
-- 1) Vote enum and votes RLS
-- =====================================================

-- Ensure enum values are uppercase SUPPORT/OPPOSE.
DO $$
DECLARE
  has_support boolean;
  has_oppose boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vote_type' AND e.enumlabel = 'SUPPORT'
  ) INTO has_support;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vote_type' AND e.enumlabel = 'OPPOSE'
  ) INTO has_oppose;

  IF NOT has_support OR NOT has_oppose THEN
    RAISE EXCEPTION 'vote_type enum must contain SUPPORT and OPPOSE';
  END IF;
END $$;

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
CREATE POLICY "Votes are viewable by everyone"
  ON public.votes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote"
  ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can update own vote" ON public.votes;
CREATE POLICY "Users can update own vote"
  ON public.votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can delete own vote" ON public.votes;
CREATE POLICY "Users can delete own vote"
  ON public.votes
  FOR DELETE TO authenticated
  USING (auth.uid() = voter_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_mark_voter ON public.votes(mark_id, voter_id);

-- Recompute mark vote counts from authoritative votes table.
CREATE OR REPLACE FUNCTION public.recompute_mark_votes(mark_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  support_count int := 0;
  oppose_count int := 0;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'SUPPORT')::int,
    COUNT(*) FILTER (WHERE vote_type = 'OPPOSE')::int
  INTO support_count, oppose_count
  FROM public.votes
  WHERE mark_id = mark_uuid;

  UPDATE public.marks
  SET
    support_votes = support_count,
    oppose_votes = oppose_count,
    endorsements_count = support_count,
    updated_at = NOW()
  WHERE id = mark_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_mark_votes(uuid) TO authenticated;

-- =====================================================
-- 2) Comment count on marks
-- =====================================================

ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- Backfill from existing comments.
UPDATE public.marks m
SET comment_count = COALESCE(c.cnt, 0)
FROM (
  SELECT mark_id, COUNT(*)::int AS cnt
  FROM public.comments
  GROUP BY mark_id
) c
WHERE c.mark_id = m.id;

UPDATE public.marks
SET comment_count = 0
WHERE comment_count IS NULL;

-- Keep comment_count synchronized via trigger.
CREATE OR REPLACE FUNCTION public.update_mark_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marks
    SET comment_count = comment_count + 1, updated_at = NOW()
    WHERE id = NEW.mark_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marks
    SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.mark_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.mark_id <> OLD.mark_id THEN
      UPDATE public.marks
      SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.mark_id;
      UPDATE public.marks
      SET comment_count = comment_count + 1, updated_at = NOW()
      WHERE id = NEW.mark_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comments_comment_count_trigger ON public.comments;
CREATE TRIGGER comments_comment_count_trigger
  AFTER INSERT OR DELETE OR UPDATE OF mark_id ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mark_comment_count();
