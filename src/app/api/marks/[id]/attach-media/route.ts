import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Link an already-uploaded file (from upload-image without mark_id) to a mark. Inserts mark_media row only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const markId = (await params).id;
  if (!markId || !/^[0-9a-f-]{36}$/i.test(markId)) {
    return NextResponse.json({ error: 'Valid mark id required' }, { status: 400 });
  }

  let body: { path: string; kind: 'image' | 'audio' | 'video'; mime_type: string; size_bytes: number; duration_ms?: number; width?: number; height?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const path = (body.path ?? '').trim();
  const kind = body.kind;
  if (!path || !['image', 'audio', 'video'].includes(kind)) {
    return NextResponse.json({ error: 'path and kind (image|audio|video) required' }, { status: 400 });
  }
  if (path.includes('..') || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
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

  const { error } = await supabase.from('mark_media').insert({
    mark_id: markId,
    owner_id: user.id,
    kind,
    mime_type: body.mime_type ?? 'application/octet-stream',
    path,
    size_bytes: Number(body.size_bytes) || 0,
    duration_ms: body.duration_ms != null ? Number(body.duration_ms) : null,
    width: body.width != null ? Number(body.width) : null,
    height: body.height != null ? Number(body.height) : null,
    poster_path: null,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[attach-media] mark_media insert failed:', error.message);
    }
    return NextResponse.json({ error: `Failed to attach media: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
