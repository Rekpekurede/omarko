import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';
import { getSignedMediaForMarkIds } from '@/lib/markMedia';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const claimType = searchParams.get('claim_type');
  const challengedOnly = searchParams.get('disputed_only') === 'true';
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
  if (claimType && claimType !== 'all') {
    let claimTypeName = claimType;
    if (/^[0-9a-f-]{36}$/i.test(claimType)) {
      const { data: claimTypeRow } = await supabase
        .from('claim_types')
        .select('name')
        .eq('id', claimType)
        .maybeSingle();
      claimTypeName = claimTypeRow?.name ?? claimType;
    }
    query = query.eq('claim_type', claimTypeName);
  }
  if (challengedOnly) {
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
    const { data: commentRows, error: commentsErr } = await supabase
      .from('comments')
      .select('mark_id')
      .in('mark_id', markIds);
    if (!commentsErr) {
      for (const row of commentRows ?? []) {
        commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[feed.GET] comment counts sample', markIds.slice(0, 3).map((id) => ({ markId: id, comments_count: commentsCountMap[id] ?? 0 })));
    }
  }
  const mediaByMarkId = await getSignedMediaForMarkIds(supabase, markIds);
  const listWithCounts = list.map((m) => ({
    ...m,
    comments_count: commentsCountMap[m.id] ?? 0,
    media: mediaByMarkId[m.id] ?? [],
  }));

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
