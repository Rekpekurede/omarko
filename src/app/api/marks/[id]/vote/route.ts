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

  let body: { vote_type?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = body.type ?? body.vote_type;
  const voteType = typeof raw === 'string' ? raw.toUpperCase() : raw;
  if (voteType !== 'SUPPORT' && voteType !== 'OPPOSE') {
    return NextResponse.json(
      { error: 'vote_type must be SUPPORT or OPPOSE' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('votes').insert({
    mark_id: markId,
    voter_id: user.id,
    vote_type: voteType,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already voted on this mark' },
        { status: 409 }
      );
    }
    if (error.message?.includes('Cannot vote on your own mark')) {
      return NextResponse.json(
        { error: 'Cannot vote on your own mark' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: fnError } = await supabase.rpc('compute_mark_status', {
    mark_uuid: markId,
  });
  if (fnError) {
    return NextResponse.json(
      { error: 'Vote recorded but status update failed' },
      { status: 500 }
    );
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json(mark);
}

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

  let body: { vote_type?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const raw = body.type ?? body.vote_type;
  const voteType = typeof raw === 'string' ? raw.toUpperCase() : raw;
  if (voteType !== 'SUPPORT' && voteType !== 'OPPOSE') {
    return NextResponse.json(
      { error: 'vote_type must be SUPPORT or OPPOSE' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('votes')
    .select('id, vote_type')
    .eq('mark_id', markId)
    .eq('voter_id', user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'No vote to change' }, { status: 404 });
  }

  const { error } = await supabase
    .from('votes')
    .update({ vote_type: voteType })
    .eq('id', existing.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc('compute_mark_status', { mark_uuid: markId });

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json(mark);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('mark_id', markId)
    .eq('voter_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc('compute_mark_status', { mark_uuid: markId });

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json(mark);
}
