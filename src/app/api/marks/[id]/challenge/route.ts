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

  let body: { text?: string; evidenceUrl?: string; claimedOriginalDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: 'Challenge text is required' }, { status: 400 });
  }

  const evidenceUrl = body.evidenceUrl?.trim() || null;
  const claimedOriginalDate = body.claimedOriginalDate?.trim() || null;
  const isEvidenceBacked = !!evidenceUrl;

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

  const { data: challenge, error: insertError } = await supabase
    .from('challenges')
    .insert({
      mark_id: markId,
      challenger_id: user.id,
      evidence_text: text,
      evidence_url: evidenceUrl,
      claimed_original_date: claimedOriginalDate || null,
      is_evidence_backed: isEvidenceBacked,
      outcome: 'PENDING',
    })
    .select('id, mark_id, challenger_id, evidence_text, evidence_url, claimed_original_date, is_evidence_backed, outcome, resolved_at, created_at, profiles!challenges_challenger_id_fkey(username)')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already challenged this mark' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

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
    .select('id, user_id, title, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url)')
    .eq('id', markId)
    .single();

  return NextResponse.json({ mark, challenge });
}
