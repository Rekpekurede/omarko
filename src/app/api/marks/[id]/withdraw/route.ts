import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
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
    .select('id, user_id, status, withdrawn_at')
    .eq('id', markId)
    .single();

  if (fetchError || !mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }

  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can withdraw' }, { status: 403 });
  }

  if (mark.withdrawn_at) {
    return NextResponse.json({ error: 'Mark is already withdrawn' }, { status: 400 });
  }

  const { count: challengeCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', markId);

  if ((challengeCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot withdraw: mark has challenges. Use Concede or Contest.' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('marks')
    .update({
      withdrawn_at: new Date().toISOString(),
      withdrawn_by: user.id,
    })
    .eq('id', markId)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.rpc('recompute_mark_dispute_count', { mark_uuid: markId });
  await supabase.rpc('create_notification', {
    p_user_id: mark.user_id,
    p_type: 'MARK_WITHDRAWN',
    p_mark_id: markId,
    p_actor_id: null,
    p_message: 'Your mark was withdrawn.',
  });

  const { data: updated } = await supabase
    .from('marks')
    .select('id, user_id, title, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json(updated);
}
