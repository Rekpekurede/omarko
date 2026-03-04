-- Migration: Interaction notifications (comments, votes, disputes, follows)
-- Idempotent and production-safe.

-- 1) Notifications table extensions
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  mark_id UUID NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  comment_id UUID NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  dispute_id UUID NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS comment_id UUID NULL REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dispute_id UUID NULL REFERENCES public.challenges(id) ON DELETE CASCADE;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Keep backward compatibility with existing records/triggers while enabling new event types.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'comment',
    'vote_support',
    'vote_oppose',
    'dispute_raised',
    'follow',
    'DISPUTE_CREATED',
    'MARK_SUPPLANTED',
    'MARK_CHAMPION',
    'MARK_WITHDRAWN',
    'COMMENT_CREATED'
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_desc
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at
  ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_mark_id
  ON public.notifications(mark_id);

-- 2) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own notifications" ON public.notifications;
CREATE POLICY "Users select own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own read_at" ON public.notifications;
CREATE POLICY "Users update own read_at"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Lock down direct function execution from regular clients.
REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, UUID, UUID, TEXT) TO service_role;

-- 3) Trigger functions

-- Comment notification: recipient = mark owner, actor = comment author.
CREATE OR REPLACE FUNCTION public.notify_on_comment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT m.user_id INTO recipient_id
  FROM public.marks m
  WHERE m.id = NEW.mark_id;

  IF recipient_id IS NULL OR NEW.user_id = recipient_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    mark_id,
    comment_id,
    metadata,
    message
  ) VALUES (
    recipient_id,
    NEW.user_id,
    'comment',
    NEW.mark_id,
    NEW.id,
    jsonb_build_object('source', 'comments_trigger'),
    ''
  );

  RETURN NEW;
END;
$$;

-- Vote notification: recipient = mark owner, actor = voter.
CREATE OR REPLACE FUNCTION public.notify_on_vote_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  notif_type TEXT;
BEGIN
  SELECT m.user_id INTO recipient_id
  FROM public.marks m
  WHERE m.id = NEW.mark_id;

  IF recipient_id IS NULL OR NEW.voter_id = recipient_id THEN
    RETURN NEW;
  END IF;

  notif_type := CASE
    WHEN NEW.vote_type = 'SUPPORT' THEN 'vote_support'
    WHEN NEW.vote_type = 'OPPOSE' THEN 'vote_oppose'
    ELSE NULL
  END;

  IF notif_type IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    mark_id,
    metadata,
    message
  ) VALUES (
    recipient_id,
    NEW.voter_id,
    notif_type,
    NEW.mark_id,
    jsonb_build_object('source', 'votes_trigger'),
    ''
  );

  RETURN NEW;
END;
$$;

-- Challenge/dispute notification: recipient = mark owner, actor = challenger.
CREATE OR REPLACE FUNCTION public.notify_on_challenge_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT m.user_id INTO recipient_id
  FROM public.marks m
  WHERE m.id = NEW.mark_id;

  IF recipient_id IS NULL OR NEW.challenger_id = recipient_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    mark_id,
    dispute_id,
    metadata,
    message
  ) VALUES (
    recipient_id,
    NEW.challenger_id,
    'dispute_raised',
    NEW.mark_id,
    NEW.id,
    jsonb_build_object('source', 'challenges_trigger'),
    ''
  );

  RETURN NEW;
END;
$$;

-- Follow notification: recipient = followed profile, actor = follower.
CREATE OR REPLACE FUNCTION public.notify_on_follow_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    actor_id,
    type,
    metadata,
    message
  ) VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    jsonb_build_object('source', 'follows_trigger'),
    ''
  );

  RETURN NEW;
END;
$$;

-- 4) Triggers
DROP TRIGGER IF EXISTS on_comment_created_notify ON public.comments;
DROP TRIGGER IF EXISTS notifications_on_comments_insert ON public.comments;
CREATE TRIGGER notifications_on_comments_insert
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_comment_insert();

DROP TRIGGER IF EXISTS notifications_on_votes_insert ON public.votes;
CREATE TRIGGER notifications_on_votes_insert
AFTER INSERT ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_vote_insert();

DROP TRIGGER IF EXISTS notifications_on_votes_update ON public.votes;
CREATE TRIGGER notifications_on_votes_update
AFTER UPDATE OF vote_type ON public.votes
FOR EACH ROW
WHEN (OLD.vote_type IS DISTINCT FROM NEW.vote_type)
EXECUTE FUNCTION public.notify_on_vote_insert();

DROP TRIGGER IF EXISTS notifications_on_challenges_insert ON public.challenges;
CREATE TRIGGER notifications_on_challenges_insert
AFTER INSERT ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_challenge_insert();

DROP TRIGGER IF EXISTS notifications_on_follows_insert ON public.follows;
CREATE TRIGGER notifications_on_follows_insert
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow_insert();
