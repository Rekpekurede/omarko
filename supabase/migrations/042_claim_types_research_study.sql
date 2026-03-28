-- Add claim types: Research, Study (for marks + claim_types table).

INSERT INTO public.claim_types (name, description)
VALUES
  ('Research', 'A research finding, synthesis, or result stated as the claim itself.'),
  ('Study', 'A study design, protocol, or outcome stated as the claim itself.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Keep constraint aligned with app CLAIM_TYPES (includes prior types + Research, Study).
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check
CHECK (claim_type IN (
  'Argument', 'Concept', 'Creation', 'Defense', 'Diagnosis', 'Design', 'Discovery',
  'Event', 'Formula', 'Implementation', 'Innovation', 'Invite', 'Joke', 'Method',
  'Movement', 'Naming', 'Observation', 'Petition', 'Phrase', 'Prediction',
  'Perspective', 'Question', 'Quote', 'Record', 'Research', 'Rule', 'Scenario',
  'Strategy', 'Story', 'Study', 'Theory', 'Trend', 'Word'
));
