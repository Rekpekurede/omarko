-- Mark media attachments (image/audio/video) for marks.

CREATE TABLE IF NOT EXISTS public.mark_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id UUID NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'audio', 'video')),
  mime_type TEXT NOT NULL,
  path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  duration_ms INT NULL,
  width INT NULL,
  height INT NULL,
  poster_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mark_media_mark_id ON public.mark_media(mark_id);
CREATE INDEX IF NOT EXISTS idx_mark_media_owner_id ON public.mark_media(owner_id);

ALTER TABLE public.mark_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mark_media_select_authenticated" ON public.mark_media;
CREATE POLICY "mark_media_select_authenticated"
ON public.mark_media
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "mark_media_insert_owner" ON public.mark_media;
CREATE POLICY "mark_media_insert_owner"
ON public.mark_media
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "mark_media_update_owner" ON public.mark_media;
CREATE POLICY "mark_media_update_owner"
ON public.mark_media
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "mark_media_delete_owner" ON public.mark_media;
CREATE POLICY "mark_media_delete_owner"
ON public.mark_media
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Storage bucket + policies (private bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mark-media', 'mark-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "mark_media_objects_select_owner" ON storage.objects;
CREATE POLICY "mark_media_objects_select_owner"
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'mark-media' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "mark_media_objects_insert_owner" ON storage.objects;
CREATE POLICY "mark_media_objects_insert_owner"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mark-media' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "mark_media_objects_update_owner" ON storage.objects;
CREATE POLICY "mark_media_objects_update_owner"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'mark-media' AND split_part(name, '/', 1) = auth.uid()::text)
WITH CHECK (bucket_id = 'mark-media' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "mark_media_objects_delete_owner" ON storage.objects;
CREATE POLICY "mark_media_objects_delete_owner"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'mark-media' AND split_part(name, '/', 1) = auth.uid()::text);
