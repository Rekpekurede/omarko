-- Signs of Influence (SOI): links/references to content that the mark author says takes credit from their work.

CREATE TABLE IF NOT EXISTS public.signs_of_influence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signs_of_influence_mark_id ON public.signs_of_influence(mark_id);

ALTER TABLE public.signs_of_influence ENABLE ROW LEVEL SECURITY;

-- Anyone can read SOI for a mark
CREATE POLICY "signs_of_influence_select"
  ON public.signs_of_influence FOR SELECT
  USING (true);

-- Only the mark owner can add SOI
CREATE POLICY "signs_of_influence_insert"
  ON public.signs_of_influence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marks m
      WHERE m.id = mark_id AND m.user_id = auth.uid()
    )
  );

-- Only the mark owner can delete SOI
CREATE POLICY "signs_of_influence_delete"
  ON public.signs_of_influence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.marks m
      WHERE m.id = mark_id AND m.user_id = auth.uid()
    )
  );
