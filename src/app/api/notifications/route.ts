import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);

  let query = supabase
    .from('notifications')
    .select('id, type, mark_id, actor_id, message, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (cursor) {
    const decoded = decodeURIComponent(cursor);
    if (/^[0-9a-f-]{36}$/i.test(decoded)) {
      const { data: row } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('id', decoded)
        .eq('user_id', user.id)
        .single();
      if (row) query = query.lt('created_at', row.created_at);
    }
  }
  query = query.limit(limit);

  const [{ data, error }, { count: unreadCount }] = await Promise.all([
    query,
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = data ?? [];
  const nextCursor = list.length === limit && list[list.length - 1]
    ? encodeURIComponent(list[list.length - 1].id)
    : null;
  return NextResponse.json({ notifications: list, nextCursor, unreadCount: unreadCount ?? 0 });
}
