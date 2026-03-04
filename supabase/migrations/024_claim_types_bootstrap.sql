-- Bootstrap claim_types table with starter data + public read policy.

CREATE TABLE IF NOT EXISTS public.claim_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.claim_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claim_types_select_anon" ON public.claim_types;
CREATE POLICY "claim_types_select_anon"
ON public.claim_types
FOR SELECT TO anon
USING (true);

DROP POLICY IF EXISTS "claim_types_select_authenticated" ON public.claim_types;
CREATE POLICY "claim_types_select_authenticated"
ON public.claim_types
FOR SELECT TO authenticated
USING (true);

INSERT INTO public.claim_types (name, description)
VALUES
  ('Creation', 'Use when you created or produced something original.'),
  ('Discovery', 'Use when you are claiming you found or uncovered something first.'),
  ('Statement', 'Use for a direct claim about a fact, identity, or ownership.'),
  ('Prediction', 'Use when making a time-bound future claim.'),
  ('Stance', 'Use when taking a clear position on an issue.'),
  ('Opinion', 'Use for a personal viewpoint or judgment.'),
  ('Teaching', 'Use when explaining knowledge or guiding others.'),
  ('Method', 'Use when sharing a repeatable process or approach.'),
  ('Catchphrase', 'Use for a memorable phrase you claim authorship of.'),
  ('Theory', 'Use for an explanatory model or concept you assert.')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;
