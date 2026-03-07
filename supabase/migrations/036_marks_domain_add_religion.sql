-- Add Religion to allowed domains for marks.
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
  'Religion',
  'General'
));
