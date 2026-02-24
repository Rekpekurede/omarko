import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
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
    .select('id, user_id, title, content')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can edit' }, { status: 403 });
  }

  const { count } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', markId);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Mark is locked: cannot edit after a challenge exists' },
      { status: 403 }
    );
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  await supabase.from('mark_versions').insert({
    mark_id: markId,
    title: mark.title ?? '',
    content: mark.content,
  });

  const { data: updated, error } = await supabase
    .from('marks')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', markId)
    .eq('user_id', user.id)
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, owner_response, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(updated);
}
