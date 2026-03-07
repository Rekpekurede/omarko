import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/createNotification';

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

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ mark_id: markId, user_id: user.id, content })
    .select('id, mark_id, user_id, content, created_at, profiles!comments_user_id_fkey(username)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const { data: markRow } = await supabase.from('marks').select('user_id').eq('id', markId).single();
    if (markRow?.user_id) {
      await createNotification({
        userId: markRow.user_id,
        actorId: user.id,
        type: 'comment',
        markId,
        commentId: comment?.id ?? null,
      });
    }
  } catch {
    /* notification failure must not break the main action */
  }

  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', markId);

  return NextResponse.json({ ...comment, comments_count: count ?? 0 });
}
