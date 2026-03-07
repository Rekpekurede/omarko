-- Fix: challenges columns must have correct types (evidence_url TEXT, claimed_original_date DATE, is_evidence_backed BOOLEAN).
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'evidence_url';
  IF col_type IS NOT NULL AND col_type != 'text' THEN
    ALTER TABLE public.challenges
      ALTER COLUMN evidence_url TYPE TEXT USING evidence_url::TEXT;
  END IF;

  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'claimed_original_date';
  IF col_type IS NOT NULL AND col_type != 'date' THEN
    ALTER TABLE public.challenges
      ALTER COLUMN claimed_original_date TYPE DATE USING (
        CASE
          WHEN claimed_original_date IS NULL THEN NULL
          WHEN claimed_original_date::TEXT ~ '^\d{4}-\d{2}-\d{2}$' THEN (claimed_original_date::TEXT)::DATE
          ELSE NULL
        END
      );
  END IF;

  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'is_evidence_backed';
  IF col_type IS NOT NULL AND col_type != 'boolean' THEN
    ALTER TABLE public.challenges
      ALTER COLUMN is_evidence_backed TYPE BOOLEAN USING FALSE;
  END IF;
END $$;
