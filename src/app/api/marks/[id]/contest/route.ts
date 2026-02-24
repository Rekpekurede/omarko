import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  const { data: mark, error: fetchError } = await supabase
    .from('marks')
    .select('id, user_id, withdrawn_at')
    .eq('id', markId)
    .single();

  if (fetchError || !mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }

  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can contest' }, { status: 403 });
  }

  if (mark.withdrawn_at) {
    return NextResponse.json({ error: 'Cannot contest a withdrawn mark' }, { status: 400 });
  }

  let body: { owner_response?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is ok
  }

  const owner_response = body.owner_response?.trim() ?? null;

  const { error: updateError } = await supabase
    .from('marks')
    .update({ owner_response })
    .eq('id', markId)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: updated } = await supabase
    .from('marks')
    .select('id, user_id, title, content, category, status, support_votes, oppose_votes, dispute_count, disputes_survived, owner_response, withdrawn_at, withdrawn_by, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json(updated);
}
