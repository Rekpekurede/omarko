import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MARK_IMAGES_BUCKET, markMediaPath } from '@/lib/storage';
import { randomUUID } from 'crypto';

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const markId = (formData.get('mark_id') as string | null)?.trim() ?? '';
  if (!file) {
    return NextResponse.json({ error: 'Missing attachment file' }, { status: 400 });
  }
  if (!markId || !/^[0-9a-f-]{36}$/i.test(markId)) {
    return NextResponse.json({ error: 'Valid mark_id is required' }, { status: 400 });
  }
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
  const path = markMediaPath(user.id, markId, filename);

  const { error } = await supabase.storage
    .from(MARK_IMAGES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    if (error.message.toLowerCase().includes('bucket') && error.message.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          error: `Storage bucket "${MARK_IMAGES_BUCKET}" not found. Create it in Supabase Storage and allow authenticated uploads. You can still post text-only.`,
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
    return NextResponse.json({ error: `Media metadata save failed: ${mediaErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ path, kind });
}
