import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_STATUS = new Set(['pending', 'reviewed', 'resolved'] as const);
const ALLOWED_MODERATION = new Set([
  'active',
  'removed_not_a_mark',
  'removed_spam',
  'removed_abuse',
  'removed_impersonation',
] as const);
type ReportStatus = 'pending' | 'reviewed' | 'resolved';
type ModerationStatus = 'active' | 'removed_not_a_mark' | 'removed_spam' | 'removed_abuse' | 'removed_impersonation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.profile_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { status?: string; moderation_status?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const nextStatus = body.status?.trim().toLowerCase();
  const moderationStatus = body.moderation_status?.trim().toLowerCase();

  if (!nextStatus || !ALLOWED_STATUS.has(nextStatus as ReportStatus)) {
    return NextResponse.json({ error: 'Invalid report status' }, { status: 400 });
  }
  if (moderationStatus && !ALLOWED_MODERATION.has(moderationStatus as ModerationStatus)) {
    return NextResponse.json({ error: 'Invalid moderation status' }, { status: 400 });
  }

  const { data: report, error: reportErr } = await supabase
    .from('reports')
    .select('id, mark_id')
    .eq('id', reportId)
    .maybeSingle();
  if (reportErr) return NextResponse.json({ error: reportErr.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const reportUpdate: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === 'reviewed') reportUpdate.reviewed_at = new Date().toISOString();
  if (nextStatus === 'resolved') reportUpdate.resolved_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('reports')
    .update(reportUpdate)
    .eq('id', report.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  if (moderationStatus) {
    const { error: markErr } = await supabase
      .from('marks')
      .update({ moderation_status: moderationStatus })
      .eq('id', report.mark_id);
    if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

