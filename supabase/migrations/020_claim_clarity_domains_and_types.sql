-- Migration: Claim clarity updates for domains and claim types.
-- Keeps legacy claim_type values valid for backward compatibility.

ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_domain_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_domain_check CHECK (domain IN (
  'Music',
  'Dance',
  'Literature',
  'VisualArt',
  'Architecture',
  'Politics',
  'Business',
  'Technology',
  'Science',
  'Sport',
  'Law',
  'Culture',
  'Food',
  'Philosophy',
  'General'
));

ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check CHECK (claim_type IN (
  -- Current claim clarity set
  'Creation',
  'Discovery',
  'Prediction',
  'Plan',
  'Teaching',
  'Conviction',
  'Strategy',
  -- Legacy values kept for compatibility with existing rows
  'Implementation',
  'Innovation',
  'Record',
  'Invite'
));
