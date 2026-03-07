-- Add claim types: Joke, Defense.

INSERT INTO public.claim_types (name, description)
VALUES
  ('Joke', 'A humorous claim — joke, bit, or comedic statement you originated.'),
  ('Defense', 'A defense of a person, position, or policy — your argument or case for something.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Allow new claim_type values on marks
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check
CHECK (claim_type IN (
  'Creation', 'Prediction', 'Discovery', 'Innovation',
  'Strategy', 'Record', 'Implementation', 'Invite',
  'Quote', 'Concept', 'Method', 'Theory',
  'Phrase', 'Formula', 'Design', 'Movement',
  'Perspective', 'Trend', 'Story', 'Observation', 'Event',
  'Joke', 'Defense'
));
