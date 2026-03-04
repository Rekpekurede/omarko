-- Migration: claim types table + single-select mark linkage.
-- Safe rollout: nullable claim_type_id, backfill when possible, enforce on new inserts via trigger.

CREATE TABLE IF NOT EXISTS public.claim_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  family TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.claim_type_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT claim_type_suggestions_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.claim_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_type_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claim_types_select_all" ON public.claim_types;
CREATE POLICY "claim_types_select_all"
ON public.claim_types
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "claim_type_suggestions_insert_own" ON public.claim_type_suggestions;
CREATE POLICY "claim_type_suggestions_insert_own"
ON public.claim_type_suggestions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "claim_type_suggestions_select_own" ON public.claim_type_suggestions;
CREATE POLICY "claim_type_suggestions_select_own"
ON public.claim_type_suggestions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

INSERT INTO public.claim_types (name, description, family)
VALUES
  ('Statement', 'A direct statement of ownership or responsibility.', 'Statement'),
  ('Claim', 'A formal assertion that something is true or yours.', 'Statement'),
  ('Discovery', 'A first realization, finding, or uncovering.', 'Discovery'),
  ('Prediction', 'A forward-looking claim about what will happen.', 'Prediction'),
  ('Opinion', 'A personal viewpoint presented for evaluation.', 'Opinion'),
  ('Conviction', 'A deeply held belief stated as a claim.', 'Opinion'),
  ('Stance', 'A clear position on an issue.', 'Opinion'),
  ('Theory', 'An explanatory claim about how something works.', 'Theory'),
  ('Hypothesis', 'A testable idea or claim.', 'Theory'),
  ('Slogan', 'A concise phrase associated with ownership or authorship.', 'Expression'),
  ('Catchphrase', 'A recurring phrase identified with a person or group.', 'Expression'),
  ('Quote', 'A cited phrase claimed as authored or originally stated.', 'Expression'),
  ('Teaching', 'An instructional claim shared as guidance.', 'Teaching'),
  ('Sermon', 'A moral or spiritual teaching claim.', 'Teaching'),
  ('Recipe', 'A claim to an authored food preparation method.', 'Method'),
  ('Method', 'A procedural approach claimed as your own.', 'Method'),
  ('Framework', 'A structured model or approach claimed as authored.', 'Method'),
  ('Design', 'A visual or conceptual design claim.', 'Creation'),
  ('Logo', 'A claimed visual identity asset.', 'Creation'),
  ('Artwork', 'A claimed original art piece.', 'Creation'),
  ('Photograph', 'A claimed original photo.', 'Creation'),
  ('Song', 'A claimed original song.', 'Creation'),
  ('Beat', 'A claimed original beat.', 'Creation'),
  ('Instrumental', 'A claimed original instrumental composition.', 'Creation'),
  ('Story', 'A claimed authored narrative.', 'Creation'),
  ('Poem', 'A claimed authored poem.', 'Creation'),
  ('Plan', 'A proposed course of action.', 'Plan'),
  ('Strategy', 'A high-level plan to achieve an outcome.', 'Plan'),
  ('Record', 'A claim about setting or holding a record.', 'Record'),
  ('Testimony', 'A first-person account presented as claim.', 'Statement'),
  ('Observation', 'A noticed fact or pattern claimed as first noted.', 'Discovery'),
  ('Insight', 'A concise realization or interpretation claim.', 'Discovery')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS claim_type_id UUID NULL REFERENCES public.claim_types(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_marks_claim_type_id ON public.marks(claim_type_id);

-- Backfill where legacy string claim_type matches seeded/new claim type names.
UPDATE public.marks m
SET claim_type_id = ct.id
FROM public.claim_types ct
WHERE m.claim_type_id IS NULL
  AND m.claim_type IS NOT NULL
  AND LOWER(m.claim_type) = LOWER(ct.name);

-- Allow unlimited claim_type names via lookup table; keep legacy text column for compatibility/read fallback.
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;

CREATE OR REPLACE FUNCTION public.enforce_mark_claim_type_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.claim_type_id IS NULL THEN
    RAISE EXCEPTION 'claim_type_id is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marks_require_claim_type_id_on_insert ON public.marks;
CREATE TRIGGER marks_require_claim_type_id_on_insert
BEFORE INSERT ON public.marks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_mark_claim_type_id();
