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

  let body: { text?: string; evidenceUrl?: string; claimedOriginalDate?: string | boolean | null; claimed_original_date?: string | boolean | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = (typeof body.text === 'string' ? body.text : '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Challenge text is required' }, { status: 400 });
  }

  const evidenceUrl = typeof body.evidenceUrl === 'string' ? body.evidenceUrl.trim() || null : null;
  const isEvidenceBacked = !!evidenceUrl;

  const rawDate = body.claimedOriginalDate ?? body.claimed_original_date;
  const isFalsyOrFalse =
    rawDate === false ||
    rawDate === 'false' ||
    rawDate === '' ||
    rawDate == null ||
    (typeof rawDate !== 'string');
  let claimedOriginalDateForDb: string | null = null;
  if (!isFalsyOrFalse && typeof rawDate === 'string' && rawDate.trim() !== '') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      claimedOriginalDateForDb = trimmed;
    } else if (/^\d{8}$/.test(trimmed)) {
      claimedOriginalDateForDb = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    }
  }

  const payload: {
    mark_id: string;
    challenger_id: string;
    evidence_text: string;
    evidence_url: string | null;
    claimed_original_date?: string;
    is_evidence_backed: boolean;
    outcome: string;
  } = {
    mark_id: markId,
    challenger_id: user.id,
    evidence_text: text,
    evidence_url: evidenceUrl,
    is_evidence_backed: isEvidenceBacked,
    outcome: 'PENDING',
  };
  if (typeof claimedOriginalDateForDb === 'string' && claimedOriginalDateForDb.length > 0) {
    payload.claimed_original_date = claimedOriginalDateForDb;
  }

  const { data: markRow } = await supabase
    .from('marks')
    .select('id, user_id, status')
    .eq('id', markId)
    .single();

  if (!markRow) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (markRow.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot challenge your own mark' }, { status: 403 });
  }

  // Pass params in exact order of function signature so PostgREST positional binding is correct
  const { data: rpcRows, error: insertError } = await supabase.rpc('insert_challenge', {
    p_challenger_id: user.id,
    p_evidence_text: text,
    p_mark_id: markId,
    p_claimed_original_date: claimedOriginalDateForDb,
    p_evidence_url: evidenceUrl,
    p_is_evidence_backed: isEvidenceBacked,
    p_outcome: 'PENDING',
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already challenged this mark' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const challengeRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!challengeRow) {
    return NextResponse.json({ error: 'Challenge insert did not return row' }, { status: 500 });
  }

  const { data: challengeWithProfile } = await supabase
    .from('challenges')
    .select('id, mark_id, challenger_id, evidence_text, evidence_url, claimed_original_date, is_evidence_backed, outcome, resolved_at, created_at, profiles!challenges_challenger_id_fkey(username)')
    .eq('id', challengeRow.id)
    .single();
  const challenge = challengeWithProfile ?? challengeRow;

  if (isEvidenceBacked && markRow.status !== 'CHAMPION' && markRow.status !== 'SUPPLANTED') {
    await supabase.rpc('recompute_mark_dispute_count', { mark_uuid: markId });
    await supabase
      .from('marks')
      .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
      .eq('id', markId)
      .in('status', ['ACTIVE', 'DISPUTED']);
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, title, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url, display_name)')
    .eq('id', markId)
    .single();

  return NextResponse.json({ mark, challenge });
}
