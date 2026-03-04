-- Prepare challenges schema for future structured challenge reasons.
-- Examples to support later: not_original, already_known, misattributed, false_claim.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS challenge_type TEXT NULL;

COMMENT ON COLUMN public.challenges.challenge_type IS
  'Optional structured challenge reason for future use.';
