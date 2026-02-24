-- Migration: Allow reading all profiles (fix "Profile not found" when profile exists)
-- RLS was likely restricting SELECT to own profile only.

-- Drop existing SELECT policies on profiles (may have been restrictive)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow authenticated users to read any profile
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to read profiles (for public profile pages when not signed in)
CREATE POLICY "profiles_select_anon" ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

-- After this migration, profiles policies:
-- SELECT: profiles_select_authenticated (authenticated), profiles_select_anon (anon)
-- INSERT: "Users can insert own profile" (auth.uid() = id) - unchanged
-- UPDATE: "Users can update own profile" (auth.uid() = id) - unchanged
