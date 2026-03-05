-- Historical Profiles: figures from history whose ideas exist as Marks.
-- Does not change existing RLS on marks/profiles; adds new tables and policies.

-- 1) profiles: add profile_type for admin/custodian checks
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text NOT NULL DEFAULT 'user'
  CHECK (profile_type IN ('user', 'historical', 'admin'));

-- 2) historical_profiles table
CREATE TABLE IF NOT EXISTS public.historical_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  era text,
  domain text,
  avatar_url text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historical_profiles_name ON public.historical_profiles(name);

ALTER TABLE public.historical_profiles ENABLE ROW LEVEL SECURITY;

-- Read: everyone can see historical profiles
CREATE POLICY "historical_profiles_select_public"
  ON public.historical_profiles FOR SELECT
  USING (true);

-- Insert/Update/Delete: admin only
CREATE POLICY "historical_profiles_insert_admin"
  ON public.historical_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

CREATE POLICY "historical_profiles_update_admin"
  ON public.historical_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

CREATE POLICY "historical_profiles_delete_admin"
  ON public.historical_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

-- 3) marks: link to historical figure (nullable)
ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS historical_profile_id uuid REFERENCES public.historical_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marks_historical_profile_id ON public.marks(historical_profile_id);

-- 4) historical_custodians: who can edit a historical figure's content
CREATE TABLE IF NOT EXISTS public.historical_custodians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  historical_profile_id uuid NOT NULL REFERENCES public.historical_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(historical_profile_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_historical_custodians_profile ON public.historical_custodians(historical_profile_id);
CREATE INDEX IF NOT EXISTS idx_historical_custodians_user ON public.historical_custodians(user_id);

ALTER TABLE public.historical_custodians ENABLE ROW LEVEL SECURITY;

-- Read: admin or the custodian themselves
CREATE POLICY "historical_custodians_select_admin_or_self"
  ON public.historical_custodians FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
    OR user_id = auth.uid()
  );

-- Insert/Update/Delete: admin only (assign custodians)
CREATE POLICY "historical_custodians_insert_admin"
  ON public.historical_custodians FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

CREATE POLICY "historical_custodians_update_admin"
  ON public.historical_custodians FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

CREATE POLICY "historical_custodians_delete_admin"
  ON public.historical_custodians FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
  );

-- 5) Allow SOI on historical marks: anyone can add SOI when mark has historical_profile_id
-- (Add new policy; existing SOI insert remains for mark owner.)
CREATE POLICY "signs_of_influence_insert_historical"
  ON public.signs_of_influence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marks m
      WHERE m.id = mark_id AND m.historical_profile_id IS NOT NULL
    )
  );

-- 6) Marks: allow update/delete for historical marks by admin or custodian (add policies only)
-- Existing policies allow owner (user_id = auth.uid()). Add policy for historical editors.
CREATE POLICY "marks_update_historical_admin_or_custodian"
  ON public.marks FOR UPDATE
  TO authenticated
  USING (
    historical_profile_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
      OR EXISTS (SELECT 1 FROM public.historical_custodians hc WHERE hc.historical_profile_id = marks.historical_profile_id AND hc.user_id = auth.uid())
    )
  )
  WITH CHECK (true);

CREATE POLICY "marks_delete_historical_admin_or_custodian"
  ON public.marks FOR DELETE
  TO authenticated
  USING (
    historical_profile_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND profile_type = 'admin')
      OR EXISTS (SELECT 1 FROM public.historical_custodians hc WHERE hc.historical_profile_id = marks.historical_profile_id AND hc.user_id = auth.uid())
    )
  );
