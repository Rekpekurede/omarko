-- Allow claim_type values used by historical seed (Theory, Formula, Milestone)
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check CHECK (claim_type IN (
  'Creation',
  'Discovery',
  'Prediction',
  'Plan',
  'Teaching',
  'Conviction',
  'Strategy',
  'Implementation',
  'Innovation',
  'Record',
  'Invite',
  'Theory',
  'Formula',
  'Milestone'
));
