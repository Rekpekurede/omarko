import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/createNotification';

/** GET: list signs of influence for a mark */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();

  const { data: mark } = await supabase
    .from('marks')
    .select('id')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }

  try {
    const { data: soi, error } = await supabase
      .from('signs_of_influence')
      .select('id, mark_id, url, created_at')
      .eq('mark_id', markId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ soi: [] });
    return NextResponse.json({ soi: soi ?? [] });
  } catch {
    return NextResponse.json({ soi: [] });
  }
}

/** POST: add a sign of influence (mark owner only) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, historical_profile_id')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  const isHistorical = !!mark.historical_profile_id;
  if (!isHistorical && mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can add SOI' }, { status: 403 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('signs_of_influence')
    .insert({ mark_id: markId, url })
    .select('id, mark_id, url, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await createNotification({
      userId: mark.user_id,
      actorId: user.id,
      type: 'soi',
      markId,
    });
  } catch {
    /* notification failure must not break the main action */
  }

  return NextResponse.json(inserted);
}
