-- Remove generic claim type "Statement" and reinforce authorship-focused types.
-- Existing marks remain render-safe via legacy text fallback.

INSERT INTO public.claim_types (name, description)
VALUES
  ('Creation', 'A work you created (art, music, writing, design, product, logo, etc.).'),
  ('Discovery', 'A new insight or finding you discovered (fact, pattern, observation).'),
  ('Method', 'A process or technique you developed.'),
  ('Prediction', 'A claim you made about the future.'),
  ('Theory', 'A structured explanation you propose.'),
  ('Teaching', 'A lesson, sermon, or explanation you authored.'),
  ('Catchphrase', 'A phrase or slogan you coined.'),
  ('Stance', 'A position you take on an issue.'),
  ('Opinion', 'A personal judgement or preference.')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

DELETE FROM public.claim_types
WHERE lower(name) = 'statement';
