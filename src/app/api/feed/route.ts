import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const claimType = searchParams.get('claim_type');
  const disputedOnly = searchParams.get('disputed_only') === 'true';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);

  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false });

  if (domain && domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    query = query.eq('domain', domain);
  }
  if (claimType && claimType !== 'all' && CLAIM_TYPES.includes(claimType as (typeof CLAIM_TYPES)[number])) {
    query = query.eq('claim_type', claimType);
  }
  if (disputedOnly) {
    query = query.gt('dispute_count', 0);
  }

  if (cursor) {
    const decoded = decodeURIComponent(cursor);
    if (/^[0-9a-f-]{36}$/i.test(decoded)) {
      const { data: row } = await supabase
        .from('marks')
        .select('created_at')
        .eq('id', decoded)
        .single();
      if (row) query = query.lt('created_at', row.created_at);
    }
  }
  query = query.limit(limit);

  const { data: marks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = marks ?? [];
  const nextCursor = list.length === limit && list[list.length - 1]
    ? encodeURIComponent(list[list.length - 1].id)
    : null;

  const markIds = list.map((m) => m.id);
  const commentsCountMap: Record<string, number> = {};
  if (markIds.length > 0) {
    const countRes = await supabase.rpc('get_comment_counts_for_marks', { p_mark_ids: markIds });
    if (!countRes.error) {
      for (const row of countRes.data ?? []) {
        commentsCountMap[row.mark_id] = Number(row.cnt ?? 0);
      }
    }
  }
  const listWithCounts = list.map((m) => ({ ...m, comments_count: commentsCountMap[m.id] ?? 0 }));

  const { data: { user } } = await supabase.auth.getUser();
  let bookmarkIds: string[] = [];
  let voteMap: Record<string, 'SUPPORT' | 'OPPOSE'> = {};
  if (user && listWithCounts.length > 0) {
    const [bRes, vRes] = await Promise.all([
      supabase.from('bookmarks').select('mark_id').eq('user_id', user.id).in('mark_id', listWithCounts.map((m) => m.id)),
      supabase.from('votes').select('mark_id, vote_type').eq('voter_id', user.id).in('mark_id', listWithCounts.map((m) => m.id)),
    ]);
    bookmarkIds = (bRes.data ?? []).map((x) => x.mark_id);
    voteMap = Object.fromEntries((vRes.data ?? []).map((v) => [v.mark_id, v.vote_type as 'SUPPORT' | 'OPPOSE']));
  }

  return NextResponse.json({ marks: listWithCounts, nextCursor, bookmarkIds, voteMap });
}
