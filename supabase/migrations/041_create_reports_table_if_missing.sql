-- Create reports table if missing (production-safe, idempotent)
-- Fixes: "Could not find the table 'public.reports' in the schema cache"

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('not_a_mark', 'spam', 'abuse', 'impersonation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'removed', 'dismissed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  resolved_at TIMESTAMPTZ NULL
);

-- Duplicate guard: same user cannot report same mark twice
CREATE UNIQUE INDEX IF NOT EXISTS reports_mark_reporter_unique_idx
  ON public.reports(mark_id, reporter_id);

CREATE INDEX IF NOT EXISTS reports_mark_id_idx ON public.reports(mark_id);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_insert_authenticated ON public.reports;
CREATE POLICY reports_insert_authenticated
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_select_reporter_or_admin ON public.reports;
CREATE POLICY reports_select_reporter_or_admin
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    reporter_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.profile_type = 'admin'
    )
  );

