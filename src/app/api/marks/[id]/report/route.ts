import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_REASONS = new Set([
  'not_a_mark',
  'spam',
  'abuse',
  'impersonation',
] as const);
type ReportReason = 'not_a_mark' | 'spam' | 'abuse' | 'impersonation';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: markExists } = await supabase
    .from('marks')
    .select('id, user_id')
    .eq('id', markId)
    .maybeSingle();
  if (!markExists) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (markExists.user_id === user.id) {
    return NextResponse.json({ error: 'You cannot report your own mark' }, { status: 400 });
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = String(body.reason ?? '').trim().toLowerCase();
  if (!ALLOWED_REASONS.has(reason as ReportReason)) {
    return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 });
  }

  const { error } = await supabase.from('reports').upsert(
    {
      mark_id: markId,
      reporter_id: user.id,
      reason,
      status: 'pending',
    },
    { onConflict: 'mark_id,reporter_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
