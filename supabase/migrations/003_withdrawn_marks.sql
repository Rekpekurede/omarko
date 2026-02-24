-- Migration: Withdrawn marks (private-by-default MVP)
-- Run in Supabase SQL Editor. Safe to run multiple times (IF NOT EXISTS / guards).

-- marks: withdrawn columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marks' AND column_name = 'withdrawn_at'
  ) THEN
    ALTER TABLE public.marks ADD COLUMN withdrawn_at TIMESTAMPTZ NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marks' AND column_name = 'withdrawn_by'
  ) THEN
    ALTER TABLE public.marks ADD COLUMN withdrawn_by UUID NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND table_name = 'marks' AND constraint_name = 'marks_withdrawn_by_fkey'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marks' AND column_name = 'withdrawn_by'
  ) THEN
    ALTER TABLE public.marks ADD CONSTRAINT marks_withdrawn_by_fkey
      FOREIGN KEY (withdrawn_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marks' AND column_name = 'owner_response'
  ) THEN
    ALTER TABLE public.marks ADD COLUMN owner_response TEXT NULL;
  END IF;
END $$;

-- RLS: marks UPDATE already allows owner (auth.uid() = user_id). No change needed for withdraw.
