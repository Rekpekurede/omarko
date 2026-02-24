-- Migration: Production Stabilization — Votes RLS + Comment Notifications
-- Run in Supabase SQL Editor. Safe to re-run (uses DROP IF EXISTS / IF NOT EXISTS).

-- =============================================================================
-- A) VOTES — Ensure RLS policies
-- =============================================================================

-- Votes: SELECT (public), INSERT/UPDATE/DELETE (own only)
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.votes;
CREATE POLICY "Votes are viewable by everyone" ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can update own vote" ON public.votes;
CREATE POLICY "Users can update own vote" ON public.votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can delete own vote" ON public.votes;
CREATE POLICY "Users can delete own vote" ON public.votes
  FOR DELETE TO authenticated
  USING (auth.uid() = voter_id);

-- Ensure unique constraint (one vote per user per mark)
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_mark_voter ON public.votes(mark_id, voter_id);

-- =============================================================================
-- B) COMMENT NOTIFICATIONS — Add type + trigger
-- =============================================================================

-- 1) Add COMMENT_CREATED to notifications type check
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('DISPUTE_CREATED', 'MARK_SUPPLANTED', 'MARK_CHAMPION', 'MARK_WITHDRAWN', 'COMMENT_CREATED'));

-- 2) Trigger function: notify mark owner when someone comments (not self)
CREATE OR REPLACE FUNCTION public.notify_comment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mark_owner_id UUID;
  commenter_username TEXT;
  msg TEXT;
BEGIN
  -- Get mark owner
  SELECT user_id INTO mark_owner_id FROM public.marks WHERE id = NEW.mark_id;
  IF mark_owner_id IS NULL THEN RETURN NEW; END IF;

  -- Skip if commenter is the mark owner (no self-notify)
  IF NEW.user_id = mark_owner_id THEN RETURN NEW; END IF;

  -- Get commenter username for message
  SELECT username INTO commenter_username FROM public.profiles WHERE id = NEW.user_id;
  msg := COALESCE('@' || commenter_username || ' commented on your mark.', 'Someone commented on your mark.');

  PERFORM public.create_notification(
    mark_owner_id,
    'COMMENT_CREATED',
    NEW.mark_id,
    NEW.user_id,
    msg
  );
  RETURN NEW;
END;
$$;

-- 3) Trigger on comments
DROP TRIGGER IF EXISTS on_comment_created_notify ON public.comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_created();
