-- Migration: Domain, Claim Type, Notifications, Indexes
-- Run in Supabase SQL Editor. Safe guards where possible.

-- Allowed values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marks' AND column_name='domain') THEN
    ALTER TABLE public.marks ADD COLUMN domain TEXT NOT NULL DEFAULT 'General';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marks' AND column_name='claim_type') THEN
    ALTER TABLE public.marks ADD COLUMN claim_type TEXT NOT NULL DEFAULT 'Creation';
  END IF;
END $$;

-- Backfill
UPDATE public.marks SET domain = 'General' WHERE domain IS NULL;
UPDATE public.marks SET claim_type = 'Creation' WHERE claim_type IS NULL;

-- Constraints
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_domain_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_domain_check CHECK (domain IN (
  'Music', 'Dance', 'Literature', 'VisualArt', 'Architecture', 'Politics', 'Business',
  'Technology', 'Science', 'Sport', 'Law', 'Culture', 'General'
));
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_claim_type_check;
ALTER TABLE public.marks ADD CONSTRAINT marks_claim_type_check CHECK (claim_type IN (
  'Creation', 'Prediction', 'Implementation', 'Discovery', 'Innovation', 'Strategy', 'Record'
));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marks_created_at_desc ON public.marks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marks_user_id ON public.marks(user_id);
CREATE INDEX IF NOT EXISTS idx_marks_domain ON public.marks(domain);
CREATE INDEX IF NOT EXISTS idx_marks_claim_type ON public.marks(claim_type);
CREATE INDEX IF NOT EXISTS idx_marks_dispute_count ON public.marks(dispute_count);
CREATE INDEX IF NOT EXISTS idx_challenges_mark_created ON public.challenges(mark_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_mark_created ON public.comments(mark_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_mark_voter ON public.votes(mark_id, voter_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DISPUTE_CREATED', 'MARK_SUPPLANTED', 'MARK_CHAMPION', 'MARK_WITHDRAWN')),
  mark_id UUID NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- RLS notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users select own notifications" ON public.notifications;
CREATE POLICY "Users select own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own read_at" ON public.notifications;
CREATE POLICY "Users update own read_at" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Insert only via SECURITY DEFINER function (no direct insert policy for anon)

-- Function to create notification (called from app or triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_mark_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nid UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, mark_id, actor_id, message)
  VALUES (p_user_id, p_type, p_mark_id, p_actor_id, COALESCE(p_message, p_type))
  RETURNING id INTO nid;
  RETURN nid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, TEXT) TO service_role;

-- Trigger: when mark status changes to SUPPLANTED or CHAMPION, notify owner
CREATE OR REPLACE FUNCTION public.notify_mark_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'SUPPLANTED' THEN
    PERFORM public.create_notification(NEW.user_id, 'MARK_SUPPLANTED', NEW.id, NULL, 'Your mark was supplanted.');
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CHAMPION' THEN
    PERFORM public.create_notification(NEW.user_id, 'MARK_CHAMPION', NEW.id, NULL, 'Your mark became champion.');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_mark_status_notify ON public.marks;
CREATE TRIGGER on_mark_status_notify
  AFTER UPDATE OF status ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.notify_mark_status_change();
