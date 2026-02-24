-- Migration: Fix profiles RLS - allow authenticated users to SELECT any profile
-- Cause: RLS was too strict (SELECT own row only). Profile pages showed "Profile not found" for other users.

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive or conflicting SELECT policies (best-effort)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_anon" ON public.profiles;

-- Allow authenticated users to SELECT any profile
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to read profiles (for public profile pages when not signed in)
CREATE POLICY "Profiles viewable by anon" ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- Ensure UPDATE remains owner-only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- After this migration, public.profiles policies:
-- SELECT: "Profiles viewable by authenticated" (authenticated), "Profiles viewable by anon" (anon)
-- UPDATE: "Profiles update own" (authenticated, owner only)
-- INSERT: unchanged (e.g. "Users can insert own profile" from schema)
