-- Storage policies for mark-media bucket: authenticated upload/update/delete, public read.
-- Run this if uploads fail with "new row violates row-level security policy".
-- Path format: {user_id}/{filename} or {user_id}/{mark_id}/{filename} (no leading slash).
-- Owner = first path segment must equal auth.uid()::text.

-- Ensure bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mark-media', 'mark-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies so we can replace them
DROP POLICY IF EXISTS "mark_media_objects_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "mark_media_objects_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "mark_media_objects_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "mark_media_objects_delete_owner" ON storage.objects;

-- Public read: anyone can view objects (for feed images without signed URLs)
CREATE POLICY "mark_media_objects_select_public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'mark-media');

-- Authenticated upload: user can only upload to path starting with their user id
CREATE POLICY "mark_media_objects_insert_owner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mark-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Owner update (for future update support)
CREATE POLICY "mark_media_objects_update_owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mark-media'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'mark-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Owner delete (for future delete support)
CREATE POLICY "mark_media_objects_delete_owner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mark-media'
  AND split_part(name, '/', 1) = auth.uid()::text
);
