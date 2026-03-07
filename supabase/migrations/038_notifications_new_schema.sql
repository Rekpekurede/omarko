-- Notifications system: new schema (is_read, types: follow, support, oppose, challenge, comment, soi).
-- Run after 019. Drops old triggers and table, creates new table.

-- Drop triggers that reference old notifications
DROP TRIGGER IF EXISTS notifications_on_comments_insert ON public.comments;
DROP TRIGGER IF EXISTS notifications_on_votes_insert ON public.votes;
DROP TRIGGER IF EXISTS notifications_on_votes_update ON public.votes;
DROP TRIGGER IF EXISTS notifications_on_challenges_insert ON public.challenges;
DROP TRIGGER IF EXISTS notifications_on_follows_insert ON public.follows;

-- Drop old table (and dependent objects)
DROP TABLE IF EXISTS public.notifications;

-- New notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'follow', 'support', 'oppose', 'challenge', 'comment', 'soi'
  )),
  mark_id UUID REFERENCES marks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = actor_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_notifications_dedup
ON notifications(user_id, actor_id, type, mark_id)
WHERE mark_id IS NOT NULL;
