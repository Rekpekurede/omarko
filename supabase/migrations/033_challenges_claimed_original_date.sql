-- Ensure challenges.claimed_original_date exists (DATE, optional).
-- Fixes: "Could not find the 'claimed_original_date' column of 'challenges' in the schema cache"
-- Safe to run if 004 was already applied (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'challenges'
      AND column_name = 'claimed_original_date'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN claimed_original_date DATE NULL;
  END IF;
END $$;
