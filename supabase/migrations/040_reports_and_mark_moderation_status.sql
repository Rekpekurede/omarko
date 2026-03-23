-- Moderation foundation: reports table + independent mark moderation_status.
-- Important: this is separate from marks.status (lifecycle/challenge state).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
    CREATE TYPE public.report_reason AS ENUM (
      'not_a_mark',
      'spam',
      'abuse',
      'impersonation',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mark_moderation_status') THEN
    CREATE TYPE public.mark_moderation_status AS ENUM (
      'active',
      'removed_not_a_mark',
      'removed_spam',
      'removed_abuse',
      'removed_impersonation'
    );
  END IF;
END $$;

ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS moderation_status public.mark_moderation_status NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.report_status NOT NULL DEFAULT 'pending'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_mark_reporter_unique
  ON public.reports(mark_id, reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_mark_id ON public.reports(mark_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
