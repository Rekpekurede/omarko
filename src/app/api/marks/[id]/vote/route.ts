import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const MARK_SELECT = 'id, user_id, content, image_url, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)';

function logVoteError(op: string, markId: string, payload: unknown, err: { message?: string; code?: string; details?: unknown }) {
  console.error(`[vote/${op}] markId=${markId} payload=${JSON.stringify(payload)} error=${err.message} code=${err.code} details=${JSON.stringify(err.details)}`);
}

function errResponse(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...details }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errResponse('Unauthorized', 401);
  }

  let body: { vote_type?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return errResponse('Invalid JSON', 400);
  }

  const raw = body.type ?? body.vote_type;
  const voteType = typeof raw === 'string' ? raw.toUpperCase() : raw;
  if (voteType !== 'SUPPORT' && voteType !== 'OPPOSE') {
    return errResponse('vote_type must be SUPPORT or OPPOSE', 400);
  }

  const payload = { markId, voterId: user.id, voteType };
  const { error } = await supabase.from('votes').insert({
    mark_id: markId,
    voter_id: user.id,
    vote_type: voteType,
  });

  if (error) {
    logVoteError('POST', markId, payload, error);
    if (error.code === '23505') {
      return errResponse('You have already voted on this mark', 409);
    }
    if (error.message?.includes('Cannot vote on your own mark')) {
      return errResponse('Cannot vote on your own mark', 403);
    }
    return errResponse(error.message ?? 'Vote failed', 500, { code: error.code });
  }

  const { error: fnError } = await supabase.rpc('compute_mark_status', { mark_uuid: markId });
  if (fnError) {
    logVoteError('compute_mark_status', markId, payload, fnError);
    return errResponse('Vote recorded but status update failed', 500);
  }

  const { data: mark } = await supabase
    .from('marks')
    .select(MARK_SELECT)
    .eq('id', markId)
    .single();

  return NextResponse.json(mark ?? {});
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errResponse('Unauthorized', 401);
  }

  let body: { vote_type?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return errResponse('Invalid JSON', 400);
  }
  const raw = body.type ?? body.vote_type;
  const voteType = typeof raw === 'string' ? raw.toUpperCase() : raw;
  if (voteType !== 'SUPPORT' && voteType !== 'OPPOSE') {
    return errResponse('vote_type must be SUPPORT or OPPOSE', 400);
  }

  const payload = { markId, voterId: user.id, voteType };
  const { data: existing } = await supabase
    .from('votes')
    .select('id, vote_type')
    .eq('mark_id', markId)
    .eq('voter_id', user.id)
    .maybeSingle();

  if (!existing) {
    return errResponse('No vote to change', 404);
  }

  const { error } = await supabase
    .from('votes')
    .update({ vote_type: voteType })
    .eq('id', existing.id);

  if (error) {
    logVoteError('PATCH', markId, payload, error);
    return errResponse(error.message ?? 'Update failed', 500, { code: error.code });
  }

  const { error: fnError } = await supabase.rpc('compute_mark_status', { mark_uuid: markId });
  if (fnError) {
    logVoteError('compute_mark_status', markId, payload, fnError);
  }

  const { data: mark } = await supabase
    .from('marks')
    .select(MARK_SELECT)
    .eq('id', markId)
    .single();

  return NextResponse.json(mark ?? {});
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errResponse('Unauthorized', 401);
  }

  const payload = { markId, voterId: user.id };
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('mark_id', markId)
    .eq('voter_id', user.id);

  if (error) {
    logVoteError('DELETE', markId, payload, error);
    return errResponse(error.message ?? 'Delete failed', 500, { code: error.code });
  }

  const { error: fnError } = await supabase.rpc('compute_mark_status', { mark_uuid: markId });
  if (fnError) {
    logVoteError('compute_mark_status', markId, payload, fnError);
  }

  const { data: mark } = await supabase
    .from('marks')
    .select(MARK_SELECT)
    .eq('id', markId)
    .single();

  return NextResponse.json(mark ?? {});
}
