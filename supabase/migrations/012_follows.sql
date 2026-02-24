-- Migration: Follow / Unfollow system
-- Users can follow/unfollow other profiles. Public graph for now.

CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_following_id ON public.follows(following_id);
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated can read all follows
CREATE POLICY "follows_select_authenticated" ON public.follows
  FOR SELECT TO authenticated USING (true);

-- INSERT: authenticated can insert only if follower_id = auth.uid()
CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

-- DELETE: authenticated can delete only if follower_id = auth.uid()
CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
