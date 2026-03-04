-- Migration: ensure marks -> claim_types relationship exists for PostgREST joins.

ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS claim_type_id UUID NULL;

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Remove any existing FK on marks.claim_type_id so behavior is consistent.
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid = 'public.marks'::regclass
      AND a.attname = 'claim_type_id'
  LOOP
    EXECUTE format('ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS %I', rec.conname);
  END LOOP;

  ALTER TABLE public.marks
    ADD CONSTRAINT marks_claim_type_id_fkey
    FOREIGN KEY (claim_type_id)
    REFERENCES public.claim_types(id)
    ON DELETE SET NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_marks_claim_type_id ON public.marks(claim_type_id);

-- Backfill legacy text claim_type -> claim_type_id where possible.
UPDATE public.marks m
SET claim_type_id = ct.id
FROM public.claim_types ct
WHERE m.claim_type_id IS NULL
  AND m.claim_type IS NOT NULL
  AND lower(trim(m.claim_type)) = lower(trim(ct.name));
