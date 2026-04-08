-- Follow graph is public (see 012_follows comment). Anonymous clients need SELECT
-- so profile follower/following counts work for logged-out visitors.
CREATE POLICY "follows_select_anon" ON public.follows
  FOR SELECT TO anon USING (true);
