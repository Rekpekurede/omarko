-- Rename claim type "Opinion" to "Perspective" in data and constraint.

-- claim_types: rename row and family
UPDATE public.claim_types SET name = 'Perspective', family = 'Perspective' WHERE name = 'Opinion';
UPDATE public.claim_types SET family = 'Perspective' WHERE family = 'Opinion';

-- Update description for the renamed row (optional; keeps wording consistent)
UPDATE public.claim_types
SET description = 'A standpoint or way of viewing something — your take for evaluation.'
WHERE name = 'Perspective' AND (description IS NULL OR description LIKE '%viewpoint%' OR description LIKE '%judgement%');

-- marks: legacy text column
UPDATE public.marks SET claim_type = 'Perspective' WHERE claim_type = 'Opinion';

-- Constraint: allow Perspective (replace Opinion if it were present)
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check
CHECK (claim_type IN (
  'Creation', 'Prediction', 'Discovery', 'Innovation',
  'Strategy', 'Record', 'Implementation', 'Invite',
  'Quote', 'Concept', 'Method', 'Theory',
  'Phrase', 'Formula', 'Design', 'Movement',
  'Perspective', 'Trend', 'Story'
));
