import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MARK_MEDIA_BUCKET, markImagePath, markMediaPath } from '@/lib/storage';
import { randomUUID } from 'crypto';

/** Normalize path: no leading/trailing slashes so RLS split_part(name, '/', 1) = auth.uid() works. */
function normalizeStoragePath(p: string): string {
  return p.replace(/^\/+|\/+$/g, '');
}

const LIMITS = {
  image: 8 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 60 * 1024 * 1024,
};

function detectKind(mime: string): 'image' | 'audio' | 'video' | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

/** Upload only (no mark_id): upload to storage and return publicUrl/path for use when creating the mark. Use for images so mark is created with image_url set. */
async function uploadOnly(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  file: File,
  formData: FormData
): Promise<NextResponse> {
  const kind = detectKind(file.type);
  if (!kind) {
    return NextResponse.json({ error: 'Only image/audio/video files are allowed' }, { status: 400 });
  }
  if (file.size > LIMITS[kind]) {
    const maxMb = kind === 'image' ? 8 : kind === 'audio' ? 25 : 60;
    return NextResponse.json({ error: `${kind} file exceeds ${maxMb}MB limit` }, { status: 400 });
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || (kind === 'image' ? 'jpg' : 'bin');
  const filename = `${randomUUID()}.${ext}`;
  const path = normalizeStoragePath(markImagePath(userId, filename));

  if (process.env.NODE_ENV === 'development') {
    console.log('[upload-image] Bucket:', MARK_MEDIA_BUCKET, '| Path:', path, '| Kind:', kind);
  }

  const { error } = await supabase.storage
    .from(MARK_MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[upload-image] Storage upload failed. Bucket:', MARK_MEDIA_BUCKET, 'Path:', path, 'Error:', error.message);
    }
    if (error.message.toLowerCase().includes('bucket') && error.message.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          error: `Storage bucket "${MARK_MEDIA_BUCKET}" not found. Create it in Supabase Storage and allow authenticated uploads. You can still post text-only.`,
          code: 'BUCKET_NOT_FOUND',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: `Attachment upload failed: ${error.message}` }, { status: 500 });
  }

  const durationMsRaw = formData.get('duration_ms') as string | null;
  const widthRaw = formData.get('width') as string | null;
  const heightRaw = formData.get('height') as string | null;

  if (kind === 'image') {
    const { data: { publicUrl } } = supabase.storage
      .from(MARK_MEDIA_BUCKET)
      .getPublicUrl(path);
    if (process.env.NODE_ENV === 'development') {
      console.log('[upload-image] Upload-only image saved, publicUrl:', publicUrl);
    }
    return NextResponse.json({
      path,
      kind,
      publicUrl,
      mime_type: file.type,
      size_bytes: file.size,
      duration_ms: durationMsRaw ? parseInt(durationMsRaw, 10) : null,
      width: widthRaw ? parseInt(widthRaw, 10) : null,
      height: heightRaw ? parseInt(heightRaw, 10) : null,
    });
  }
  return NextResponse.json({
    path,
    kind,
    mime_type: file.type,
    size_bytes: file.size,
    duration_ms: durationMsRaw ? parseInt(durationMsRaw, 10) : null,
    width: widthRaw ? parseInt(widthRaw, 10) : null,
    height: heightRaw ? parseInt(heightRaw, 10) : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const markIdRaw = (formData.get('mark_id') as string | null)?.trim() ?? '';
  const hasMarkId = !!markIdRaw && /^[0-9a-f-]{36}$/i.test(markIdRaw);

  if (!file) {
    return NextResponse.json({ error: 'Missing attachment file' }, { status: 400 });
  }

  // Upload-only flow: no mark_id. Caller will create mark with image_url then optionally attach-media.
  if (!hasMarkId) {
    return uploadOnly(supabase, user.id, file, formData);
  }

  const markId = markIdRaw;
  const { data: markRow } = await supabase
    .from('marks')
    .select('id, user_id')
    .eq('id', markId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!markRow) {
    return NextResponse.json({ error: 'Mark not found or not owned by user' }, { status: 403 });
  }

  const kind = detectKind(file.type);
  if (!kind) {
    return NextResponse.json({ error: 'Only image/audio/video files are allowed' }, { status: 400 });
  }
  if (file.size > LIMITS[kind]) {
    const maxMb = kind === 'image' ? 8 : kind === 'audio' ? 25 : 60;
    return NextResponse.json({ error: `${kind} file exceeds ${maxMb}MB limit` }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${randomUUID()}.${ext}`;
  const path = normalizeStoragePath(markMediaPath(user.id, markId, filename));

  if (process.env.NODE_ENV === 'development') {
    console.log('[upload-image] Bucket:', MARK_MEDIA_BUCKET, '| Path:', path, '| MarkId:', markId, '| Kind:', kind);
  }

  const { error } = await supabase.storage
    .from(MARK_MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[upload-image] Storage upload failed. Bucket:', MARK_MEDIA_BUCKET, 'Path:', path, 'Error:', error.message);
    }
    if (error.message.toLowerCase().includes('bucket') && error.message.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          error: `Storage bucket "${MARK_MEDIA_BUCKET}" not found. Create it in Supabase Storage and allow authenticated uploads. You can still post text-only.`,
          code: 'BUCKET_NOT_FOUND',
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: `Attachment upload failed: ${error.message}` }, { status: 500 });
  }

  const durationMsRaw = formData.get('duration_ms') as string | null;
  const widthRaw = formData.get('width') as string | null;
  const heightRaw = formData.get('height') as string | null;

  const { error: mediaErr } = await supabase.from('mark_media').insert({
    mark_id: markId,
    owner_id: user.id,
    kind,
    mime_type: file.type,
    path,
    size_bytes: file.size,
    duration_ms: durationMsRaw ? parseInt(durationMsRaw, 10) : null,
    width: widthRaw ? parseInt(widthRaw, 10) : null,
    height: heightRaw ? parseInt(heightRaw, 10) : null,
    poster_path: null,
  });
  if (mediaErr) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[upload-image] mark_media insert failed:', mediaErr.message);
    }
    return NextResponse.json({ error: `Media metadata save failed: ${mediaErr.message}` }, { status: 500 });
  }

  if (kind === 'image') {
    const { data: { publicUrl } } = supabase.storage
      .from(MARK_MEDIA_BUCKET)
      .getPublicUrl(path);
    if (process.env.NODE_ENV === 'development') {
      console.log('[upload-image] Mark image saved. Bucket:', MARK_MEDIA_BUCKET, 'image_url:', publicUrl);
    }
    const { error: updateErr } = await supabase
      .from('marks')
      .update({ image_url: publicUrl })
      .eq('id', markId)
      .eq('user_id', user.id);
    if (updateErr) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[upload-image] Failed to set mark image_url:', updateErr.message);
      }
      return NextResponse.json({ error: `Failed to set mark image_url: ${updateErr.message}` }, { status: 500 });
    }
    return NextResponse.json({ path, kind, publicUrl });
  }

  return NextResponse.json({ path, kind });
}
