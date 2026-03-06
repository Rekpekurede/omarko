-- Expanded claim types: 18 canonical types. Update check constraint and ensure claim_types rows exist.

ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;

ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check
CHECK (claim_type IN (
  'Creation', 'Prediction', 'Discovery', 'Innovation',
  'Strategy', 'Record', 'Implementation', 'Invite',
  'Quote', 'Concept', 'Method', 'Theory',
  'Phrase', 'Formula', 'Design', 'Movement',
  'Trend', 'Story'
));

INSERT INTO public.claim_types (name, description)
VALUES
  ('Creation', 'Something you made — art, product, writing, software'),
  ('Quote', 'Words you said that others have repeated'),
  ('Prediction', 'A future outcome you called before it happened'),
  ('Discovery', 'Something you found or identified first'),
  ('Innovation', 'An improvement on something that already existed'),
  ('Concept', 'An original idea or framework you developed'),
  ('Method', 'A process or technique you invented'),
  ('Theory', 'An explanatory model you constructed'),
  ('Phrase', 'A coined term or expression that spread'),
  ('Formula', 'A mathematical, scientific, or strategic formula'),
  ('Design', 'A visual, product, or structural design'),
  ('Movement', 'A cultural, social, or artistic movement you started'),
  ('Trend', 'A pattern you identified and named before others'),
  ('Story', 'A narrative, script, or fictional work you authored'),
  ('Strategy', 'A plan or approach you devised'),
  ('Record', 'A measurable achievement — fastest, first, most'),
  ('Implementation', 'Taking an idea and making it real'),
  ('Invite', 'An open call or challenge you issued')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
