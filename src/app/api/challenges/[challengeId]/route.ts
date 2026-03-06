import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: challengeRow, error: fetchError } = await supabase
    .from('challenges')
    .select('id, challenger_id, mark_id, evidence_url, is_evidence_backed, outcome')
    .eq('id', challengeId)
    .single();

  if (fetchError || !challengeRow) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }
  if (challengeRow.challenger_id !== user.id) {
    return NextResponse.json({ error: 'Only the challenger can edit' }, { status: 403 });
  }
  if (challengeRow.outcome !== 'PENDING') {
    return NextResponse.json({ error: 'Resolved challenges cannot be edited' }, { status: 400 });
  }

  let body: { evidenceUrl?: string | boolean | null; claimedOriginalDate?: string | boolean | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const evidenceUrl =
    typeof body.evidenceUrl === 'string'
      ? (body.evidenceUrl.trim() || null)
      : body.evidenceUrl !== undefined
        ? null
        : undefined;
  const rawDate = body.claimedOriginalDate;
  const claimedOriginalDateNormalized =
    typeof rawDate === 'string' && rawDate.trim() !== ''
      ? (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim()) ? rawDate.trim() : null)
      : rawDate !== undefined
        ? null
        : undefined;

  const updates: { evidence_url?: string | null; claimed_original_date?: string | null; is_evidence_backed?: boolean } = {};
  if (evidenceUrl !== undefined) updates.evidence_url = evidenceUrl;
  if (claimedOriginalDateNormalized !== undefined) updates.claimed_original_date = claimedOriginalDateNormalized;

  const wasEvidenceBacked = challengeRow.is_evidence_backed;
  const addingEvidence = !!evidenceUrl && !challengeRow.evidence_url;
  if (addingEvidence) updates.is_evidence_backed = true;

  const { error: updateError } = await supabase
    .from('challenges')
    .update(updates)
    .eq('id', challengeId)
    .eq('challenger_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (addingEvidence && !wasEvidenceBacked) {
    const { data: markRow } = await supabase
      .from('marks')
      .select('status')
      .eq('id', challengeRow.mark_id)
      .single();
    if (markRow && markRow.status !== 'CHAMPION' && markRow.status !== 'SUPPLANTED') {
      await supabase.rpc('recompute_mark_dispute_count', { mark_uuid: challengeRow.mark_id });
      await supabase
        .from('marks')
        .update({ status: 'DISPUTED', updated_at: new Date().toISOString() })
        .eq('id', challengeRow.mark_id)
        .in('status', ['ACTIVE', 'DISPUTED']);
    }
  }

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, mark_id, challenger_id, evidence_text, evidence_url, claimed_original_date, is_evidence_backed, outcome, resolved_at, created_at, profiles!challenges_challenger_id_fkey(username)')
    .eq('id', challengeId)
    .single();

  return NextResponse.json(challenge);
}
