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

  let body: { evidence_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const evidence_text = body.evidence_text?.trim();
  if (!evidence_text) {
    return NextResponse.json(
      { error: 'Challenge content is required' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('challenges').insert({
    mark_id: markId,
    challenger_id: user.id,
    evidence_text,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already challenged this mark' },
        { status: 409 }
      );
    }
    if (error.message?.includes('Cannot challenge your own mark')) {
      return NextResponse.json(
        { error: 'Cannot challenge your own mark' },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, title, content, category, status, support_votes, oppose_votes, dispute_count, disputes_survived, created_at, updated_at, profiles!marks_user_id_fkey(username, avatar_url, display_name)')
    .eq('id', markId)
    .single();

  return NextResponse.json(mark);
}
