-- =============================================================================
-- Omarko: Image support for Marks + Storage policies
-- Run in Supabase SQL Editor. Buckets created via Dashboard (see comments below).
-- =============================================================================

-- 1) Add image_url column to marks
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS image_url text;

-- 2) Ensure profiles has avatar_url and updated_at (if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- =============================================================================
-- 3) STORAGE BUCKETS
-- Create these in Supabase Dashboard: Storage → New bucket
-- - Bucket name: avatars (public)
-- - Bucket name: mark-images (public)
-- =============================================================================

-- 4) Storage policies for avatars bucket
-- MANUAL: Create bucket "avatars" (public) in Dashboard: Storage → New bucket
-- Avatars path: {user_id}.png at root
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- 5) Storage policies for mark-images bucket
-- MANUAL: Create bucket "mark-images" (public) in Dashboard: Storage → New bucket
-- Path: {user_id}/{filename} - folder = user id for owner check
DROP POLICY IF EXISTS "mark_images_upload" ON storage.objects;
CREATE POLICY "mark_images_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mark-images' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "mark_images_read" ON storage.objects;
CREATE POLICY "mark_images_read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mark-images');
DROP POLICY IF EXISTS "mark_images_delete" ON storage.objects;
CREATE POLICY "mark_images_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mark-images' AND (storage.foldername(name))[1] = auth.uid()::text);
