import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** DELETE: remove a sign of influence (mark owner only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; soiId: string }> }
) {
  const { id: markId, soiId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can remove SOI' }, { status: 403 });
  }

  const { error } = await supabase
    .from('signs_of_influence')
    .delete()
    .eq('id', soiId)
    .eq('mark_id', markId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
