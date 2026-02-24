-- Migration: Integrity refinement - mark_versions, CONCEDED, votes update/delete, profile stats
-- Run in Supabase SQL Editor.

-- 1) mark_versions table
CREATE TABLE IF NOT EXISTS public.mark_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mark_versions_mark_id ON public.mark_versions(mark_id);

-- 2) challenges.outcome: add CONCEDED
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_outcome_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_outcome_check
  CHECK (outcome IN ('PENDING', 'WON', 'LOST', 'CONCEDED', 'WITHDRAWN'));

-- 3) profiles: add disputes_conceded
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disputes_conceded INTEGER NOT NULL DEFAULT 0;

-- 4) votes: allow UPDATE and DELETE (users change/remove their vote)
DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote" ON public.votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Users can update own vote" ON public.votes FOR UPDATE USING (auth.uid() = voter_id) WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Users can delete own vote" ON public.votes FOR DELETE USING (auth.uid() = voter_id);

-- 5) mark_versions RLS
ALTER TABLE public.mark_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mark_versions viewable by everyone" ON public.mark_versions;
CREATE POLICY "mark_versions viewable by everyone" ON public.mark_versions FOR SELECT USING (true);
CREATE POLICY "mark_versions insert by mark owner" ON public.mark_versions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.marks WHERE id = mark_id AND user_id = auth.uid()));

