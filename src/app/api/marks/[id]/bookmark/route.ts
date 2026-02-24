import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mark } = await supabase.from('marks').select('id').eq('id', markId).single();
  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }

  const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, mark_id: markId });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ bookmarked: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bookmarked: true });
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

  await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('mark_id', markId);
  return NextResponse.json({ bookmarked: false });
}
