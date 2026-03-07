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

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, status')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can concede' }, { status: 403 });
  }
  if (mark.status === 'CHAMPION' || mark.status === 'SUPPLANTED') {
    return NextResponse.json({ error: 'Mark is already resolved' }, { status: 400 });
  }

  const { data: pending } = await supabase
    .from('challenges')
    .select('id, challenger_id')
    .eq('mark_id', markId)
    .eq('outcome', 'PENDING');

  if (!pending?.length) {
    return NextResponse.json({ error: 'No pending challenges to concede' }, { status: 400 });
  }

  const now = new Date().toISOString();
  await supabase
    .from('challenges')
    .update({ outcome: 'CONCEDED', resolved_at: now })
    .eq('mark_id', markId)
    .eq('outcome', 'PENDING');

  await supabase
    .from('marks')
    .update({ status: 'SUPPLANTED', updated_at: now })
    .eq('id', markId);

  await supabase.rpc('recompute_mark_dispute_count', { mark_uuid: markId });

  const { data: ownerProfile } = await supabase.from('profiles').select('disputes_conceded').eq('id', mark.user_id).single();
  await supabase.from('profiles').update({ disputes_conceded: (ownerProfile?.disputes_conceded ?? 0) + 1 }).eq('id', mark.user_id);

  for (const c of pending) {
    const { data: chalProfile } = await supabase.from('profiles').select('disputes_won').eq('id', c.challenger_id).single();
    await supabase.from('profiles').update({ disputes_won: (chalProfile?.disputes_won ?? 0) + 1 }).eq('id', c.challenger_id);
  }

  const { data: updated } = await supabase
    .from('marks')
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at')
    .eq('id', markId)
    .single();

  return NextResponse.json(updated);
}
