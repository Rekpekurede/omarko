-- Migration: Challenges (evidence-backed only count), Comments, Outcomes
-- Run in Supabase SQL Editor. Safe guards where possible.

-- 1) challenges: new columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='evidence_url') THEN
    ALTER TABLE public.challenges ADD COLUMN evidence_url TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='claimed_original_date') THEN
    ALTER TABLE public.challenges ADD COLUMN claimed_original_date DATE NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='is_evidence_backed') THEN
    ALTER TABLE public.challenges ADD COLUMN is_evidence_backed BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='outcome') THEN
    ALTER TABLE public.challenges ADD COLUMN outcome TEXT NOT NULL DEFAULT 'PENDING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='challenges' AND column_name='resolved_at') THEN
    ALTER TABLE public.challenges ADD COLUMN resolved_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Constrain outcome values
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_outcome_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_outcome_check CHECK (outcome IN ('PENDING', 'WON', 'LOST', 'WITHDRAWN'));

-- 2) comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_mark_id ON public.comments(mark_id);

-- 3) marks: ensure dispute_count, withdrawn_at, withdrawn_by (may exist from prior migrations)
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS dispute_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marks' AND column_name='withdrawn_by') THEN
    ALTER TABLE public.marks ADD COLUMN withdrawn_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Drop trigger that auto-sets DISPUTED on every challenge insert (we now do it only for evidence-backed in app)
DROP TRIGGER IF EXISTS on_challenge_created ON public.challenges;

-- dispute_count = count of challenges where is_evidence_backed = true AND outcome = 'PENDING'
CREATE OR REPLACE FUNCTION public.recompute_mark_dispute_count(mark_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.marks SET dispute_count = (
    SELECT COUNT(*)::INT FROM public.challenges
    WHERE mark_id = mark_uuid AND is_evidence_backed = true AND outcome = 'PENDING'
  ), updated_at = NOW() WHERE id = mark_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: evidence-backed = true only where evidence_url present
UPDATE public.challenges SET is_evidence_backed = true WHERE evidence_url IS NOT NULL AND TRIM(evidence_url) != '';
-- Recompute dispute_count for all marks
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.marks
  LOOP
    PERFORM public.recompute_mark_dispute_count(r.id);
  END LOOP;
END $$;

-- RLS for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert comment" ON public.comments;
CREATE POLICY "Authenticated can insert comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- compute_mark_status: set challenge outcomes (WON/LOST), update profiles, then recompute dispute_count
CREATE OR REPLACE FUNCTION public.compute_mark_status(mark_uuid UUID)
RETURNS void AS $$
DECLARE
  support_count INT;
  oppose_count INT;
  dispute_ct INT;
  new_status mark_status;
  old_status mark_status;
  mark_owner_id UUID;
  threshold INT := 10;
  rec RECORD;
BEGIN
  SELECT status, user_id, dispute_count INTO old_status, mark_owner_id, dispute_ct
  FROM public.marks WHERE id = mark_uuid;
  IF NOT FOUND THEN RETURN; END IF;
  IF old_status = 'CHAMPION' OR old_status = 'SUPPLANTED' THEN
    RETURN;
  END IF;

  SELECT COUNT(*) FILTER (WHERE vote_type = 'SUPPORT'), COUNT(*) FILTER (WHERE vote_type = 'OPPOSE')
  INTO support_count, oppose_count FROM public.votes WHERE mark_id = mark_uuid;

  IF (oppose_count - support_count) >= threshold THEN
    new_status := 'SUPPLANTED';
  ELSIF (support_count - oppose_count) >= threshold THEN
    new_status := 'CHAMPION';
  ELSIF dispute_ct > 0 THEN
    new_status := 'DISPUTED';
  ELSE
    new_status := 'ACTIVE';
  END IF;

  UPDATE public.marks SET
    status = new_status,
    support_votes = support_count,
    oppose_votes = oppose_count,
    endorsements_count = support_count,
    updated_at = NOW()
  WHERE id = mark_uuid;

  -- SUPPLANTED: set outcome WON, resolved_at for PENDING challenges; owner disputes_lost, challengers disputes_won
  IF new_status = 'SUPPLANTED' AND old_status != 'SUPPLANTED' THEN
    UPDATE public.challenges SET outcome = 'WON', resolved_at = NOW() WHERE mark_id = mark_uuid AND outcome = 'PENDING';
    UPDATE public.profiles SET disputes_lost = disputes_lost + 1 WHERE id = mark_owner_id;
    FOR rec IN SELECT challenger_id FROM public.challenges WHERE mark_id = mark_uuid
    LOOP
      UPDATE public.profiles SET disputes_won = disputes_won + 1 WHERE id = rec.challenger_id;
    END LOOP;
  END IF;

  -- CHAMPION after DISPUTED: set outcome LOST, resolved_at for PENDING; disputes_survived++, owner disputes_won, challengers disputes_lost
  IF new_status = 'CHAMPION' AND old_status = 'DISPUTED' THEN
    UPDATE public.challenges SET outcome = 'LOST', resolved_at = NOW() WHERE mark_id = mark_uuid AND outcome = 'PENDING';
    UPDATE public.marks SET disputes_survived = disputes_survived + 1 WHERE id = mark_uuid;
    UPDATE public.profiles SET disputes_won = disputes_won + 1 WHERE id = mark_owner_id;
    FOR rec IN SELECT challenger_id FROM public.challenges WHERE mark_id = mark_uuid
    LOOP
      UPDATE public.profiles SET disputes_lost = disputes_lost + 1 WHERE id = rec.challenger_id;
    END LOOP;
  END IF;

  PERFORM public.recompute_mark_dispute_count(mark_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
