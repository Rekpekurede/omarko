import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const rawType = body.type || body.vote_type;
  const incomingType = rawType?.toUpperCase();

  if (incomingType !== 'SUPPORT' && incomingType !== 'OPPOSE') {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
  }

  // 1. Check for existing vote
  const { data: existing } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('mark_id', markId)
    .eq('voter_id', user.id)
    .maybeSingle();

  if (existing?.vote_type === incomingType) {
    // TOGGLE OFF: User clicked the same button, remove the vote
    await supabase.from('votes').delete().eq('mark_id', markId).eq('voter_id', user.id);
  } else {
    // UPSERT: Insert new or change existing (Support -> Oppose)
    await supabase.from('votes').upsert({
      mark_id: markId,
      voter_id: user.id,
      vote_type: incomingType,
    }, { onConflict: 'mark_id,voter_id' });
  }

  // 2. Trigger Recompute
  await supabase.rpc('recompute_mark', { mark_uuid: markId });

  // 3. Return authoritative state
  const { data: updatedMark } = await supabase
    .from('marks')
    .select('support_votes, oppose_votes, status')
    .eq('id', markId)
    .single();

  return NextResponse.json({
    markId,
    userVote: existing?.vote_type === incomingType ? null : incomingType,
    support_votes: updatedMark?.support_votes || 0,
    oppose_votes: updatedMark?.oppose_votes || 0
  });
}
