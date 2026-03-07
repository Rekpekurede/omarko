/** Audit: removed console.log and unused VOTE_ROUTE_VERSION. */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/createNotification';

function normalizeVoteType(input: unknown): 'SUPPORT' | 'OPPOSE' {
  const normalized = String(input ?? '').trim().toUpperCase();
  if (normalized !== 'SUPPORT' && normalized !== 'OPPOSE') {
    throw new Error(`Invalid vote_type incoming: ${String(input)}`);
  }
  return normalized as 'SUPPORT' | 'OPPOSE';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { type?: string; vote_type?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error('[vote.POST] invalid json', { markId, err });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  let voteType: 'SUPPORT' | 'OPPOSE';
  try {
    voteType = normalizeVoteType(body.vote_type ?? (body as { voteType?: unknown }).voteType ?? body.type);
  } catch (err) {
    console.error('[vote.POST] invalid vote_type payload', { markId, body, err });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid vote type' }, { status: 400 });
  }

  const { data: markRow, error: markLookupErr } = await supabase
    .from('marks')
    .select('user_id')
    .eq('id', markId)
    .single();
  if (markLookupErr) {
    console.error('[vote.POST] mark lookup failed', {
      markId,
      code: markLookupErr.code,
      message: markLookupErr.message,
      details: markLookupErr.details,
    });
    return NextResponse.json({ error: markLookupErr.message }, { status: 500 });
  }
  const isOwnMark = markRow.user_id === user.id;
  if (isOwnMark && voteType === 'OPPOSE') {
    return NextResponse.json({ error: 'You cannot oppose your own mark.' }, { status: 400 });
  }

  // 1. Check for existing vote
  const { data: existing, error: existingErr } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('mark_id', markId)
    .eq('voter_id', user.id)
    .maybeSingle();
  if (existingErr) {
    console.error('[vote.POST] select existing failed', {
      markId,
      userId: user.id,
      code: existingErr.code,
      message: existingErr.message,
      details: existingErr.details,
    });
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  let userVote: 'SUPPORT' | 'OPPOSE' | null = voteType;
  if (existing?.vote_type === voteType) {
    // TOGGLE OFF: User clicked the same button, remove the vote
    const { error: deleteErr } = await supabase.from('votes').delete().eq('mark_id', markId).eq('voter_id', user.id);
    if (deleteErr) {
      console.error('[vote.POST] delete vote failed', {
        markId,
        userId: user.id,
        code: deleteErr.code,
        message: deleteErr.message,
        details: deleteErr.details,
      });
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }
    userVote = null;
  } else {
    // UPSERT: Insert new or change existing (Support -> Oppose)
    const payload = {
      mark_id: markId,
      voter_id: user.id,
      vote_type: voteType,
    };
    const { error: upsertErr } = await supabase.from('votes').upsert(payload, { onConflict: 'mark_id,voter_id' });
    if (upsertErr) {
      console.error('[vote.POST] upsert vote failed', {
        markId,
        userId: user.id,
        voteType,
        code: upsertErr.code,
        message: upsertErr.message,
        details: upsertErr.details,
      });
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  // 2. Trigger Recompute (prefer votes-only recompute, fallback to existing status recompute)
  let recomputeErr: { code?: string; message: string; details?: string } | null = null;
  const recomputeVotesRes = await supabase.rpc('recompute_mark_votes', { mark_uuid: markId });
  if (recomputeVotesRes.error) {
    console.error('[vote.POST] recompute_mark_votes failed, trying compute_mark_status', {
      markId,
      code: recomputeVotesRes.error.code,
      message: recomputeVotesRes.error.message,
      details: recomputeVotesRes.error.details,
    });
    const recomputeStatusRes = await supabase.rpc('compute_mark_status', { mark_uuid: markId });
    if (recomputeStatusRes.error) {
      recomputeErr = recomputeStatusRes.error;
    }
  }
  if (recomputeErr) {
    console.error('[vote.POST] recompute failed', {
      markId,
      code: recomputeErr.code,
      message: recomputeErr.message,
      details: recomputeErr.details,
    });
    return NextResponse.json({ error: recomputeErr.message }, { status: 500 });
  }

  if (userVote !== null) {
    try {
      await createNotification({
        userId: markRow.user_id,
        actorId: user.id,
        type: userVote === 'SUPPORT' ? 'support' : 'oppose',
        markId,
      });
    } catch {
      /* notification failure must not break the main action */
    }
  }

  // 3. Return authoritative state
  const { data: updatedMark, error: markErr } = await supabase
    .from('marks')
    .select('support_votes, oppose_votes, status')
    .eq('id', markId)
    .single();
  if (markErr) {
    console.error('[vote.POST] fetch updated mark failed', {
      markId,
      code: markErr.code,
      message: markErr.message,
      details: markErr.details,
    });
    return NextResponse.json({ error: markErr.message }, { status: 500 });
  }

  return NextResponse.json({
    markId,
    userVote,
    support_votes: updatedMark?.support_votes || 0,
    oppose_votes: updatedMark?.oppose_votes || 0
  });
}
