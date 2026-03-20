-- Add claim type: Scenario.

INSERT INTO public.claim_types (name, description)
VALUES
  ('Scenario', 'A situation or scenario you described, outlined, or set out.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check
CHECK (claim_type IN (
  'Creation', 'Prediction', 'Discovery', 'Innovation',
  'Strategy', 'Record', 'Implementation', 'Invite',
  'Quote', 'Concept', 'Method', 'Theory',
  'Phrase', 'Formula', 'Design', 'Movement',
  'Perspective', 'Trend', 'Story', 'Observation', 'Event',
  'Joke', 'Defense', 'Word', 'Scenario'
));
