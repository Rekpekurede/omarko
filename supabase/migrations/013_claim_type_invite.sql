-- Migration: Add Invite claim type
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check CHECK (claim_type IN (
  'Creation', 'Prediction', 'Implementation', 'Discovery', 'Innovation', 'Strategy', 'Record', 'Invite'
));
