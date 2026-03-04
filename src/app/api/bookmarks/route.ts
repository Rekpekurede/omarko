import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

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
    .from('bookmarks')
    .select('mark_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    const decoded = decodeURIComponent(cursor);
    if (/^[0-9a-f-]{36}$/i.test(decoded)) {
      const { data: row } = await supabase
        .from('bookmarks')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('mark_id', decoded)
        .single();
      if (row) query = query.lt('created_at', row.created_at);
    }
  }

  const { data: bookmarks } = await query;
  const markIds = (bookmarks ?? []).map((b) => b.mark_id);
  if (markIds.length === 0) {
    return NextResponse.json({ marks: [], nextCursor: null });
  }

  const { data: marks } = await supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .in('id', markIds)
    .is('withdrawn_at', null);

  const orderMap = new Map(markIds.map((id, i) => [id, i]));
  const sorted = (marks ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  const sortedIds = sorted.map((m) => m.id);
  const commentsCountMap: Record<string, number> = {};
  if (sortedIds.length > 0) {
    const { data: commentRows, error: commentsErr } = await supabase
      .from('comments')
      .select('mark_id')
      .in('mark_id', sortedIds);
    if (!commentsErr) {
      for (const row of commentRows ?? []) {
        commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
      }
    }
  }
  const sortedWithCounts = sorted.map((m) => ({ ...m, comments_count: commentsCountMap[m.id] ?? 0 }));
  const nextCursor = sorted.length === limit && sorted[sorted.length - 1]
    ? encodeURIComponent(sorted[sorted.length - 1].id)
    : null;

  return NextResponse.json({ marks: sortedWithCounts, nextCursor });
}
