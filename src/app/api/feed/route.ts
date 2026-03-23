import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const claimType = searchParams.get('claim_type');
  const followingOnly = searchParams.get('following') === 'true';
  const source = searchParams.get('source');
  const disputedOnly = searchParams.get('disputed_only') === 'true';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false });

  if (followingOnly) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Critical guard: when the follow list is empty, return an empty feed (never global fallback).
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (followsError) {
      console.error('[feed.GET] failed to fetch follows', followsError.message);
      return NextResponse.json({ error: 'Failed to load following feed' }, { status: 500 });
    }

    const followedUserIds = Array.from(new Set((follows ?? []).map((f) => f.following_id).filter(Boolean)));
    if (followedUserIds.length === 0) {
      return NextResponse.json({ marks: [], nextCursor: null, bookmarkIds: [], voteMap: {} });
    }
    query = query.in('user_id', followedUserIds);
  }

  if (source === 'historical') {
    query = query.not('historical_profile_id', 'is', null);
  } else if (source === 'user') {
    query = query.is('historical_profile_id', null);
  }
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
    console.error('[feed.GET] query failed', error.message);
    return NextResponse.json({ error: 'Failed to load feed' }, { status: 500 });
  }
  const list = marks ?? [];
  const nextCursor = list.length === limit && list[list.length - 1]
    ? encodeURIComponent(list[list.length - 1].id)
    : null;

  const markIds = list.map((m) => m.id);
  const commentsCountMap: Record<string, number> = {};
  const soiCountMap: Record<string, number> = {};
  const latestCommentsMap: Record<string, { username: string; content: string; created_at: string }[]> = {};
  if (markIds.length > 0) {
    const [countRes, commentsRes, soiRes] = await Promise.all([
      supabase.rpc('get_comment_counts_for_marks', { p_mark_ids: markIds }).then((r) => (r.error ? { data: [] } : r)),
      supabase
        .from('comments')
        .select('mark_id, content, created_at, profiles!comments_user_id_fkey(username)')
        .in('mark_id', markIds)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('signs_of_influence').select('mark_id').in('mark_id', markIds),
    ]);
    for (const row of countRes.data ?? []) {
      commentsCountMap[row.mark_id] = Number(row.cnt ?? 0);
    }
    for (const row of soiRes.data ?? []) {
      soiCountMap[row.mark_id] = (soiCountMap[row.mark_id] ?? 0) + 1;
    }
    const byMark = new Map<string, { username: string; content: string; created_at: string }[]>();
    for (const c of commentsRes.data ?? []) {
      const mid = c.mark_id;
      const arr = byMark.get(mid) ?? [];
      if (arr.length < 2) {
        const p = c.profiles as { username?: string } | { username?: string }[] | null;
        const u = (p && (Array.isArray(p) ? p[0]?.username : (p as { username?: string }).username)) ?? 'unknown';
        arr.push({ username: u, content: c.content, created_at: c.created_at });
        byMark.set(mid, arr);
      }
    }
    for (const mid of markIds) {
      latestCommentsMap[mid] = byMark.get(mid) ?? [];
      if (!(mid in commentsCountMap)) commentsCountMap[mid] = 0;
    }
  }

  const listWithComments = list.map((m) => ({
    ...m,
    comments_count: commentsCountMap[m.id] ?? 0,
    soi_count: soiCountMap[m.id] ?? 0,
    latest_comments: latestCommentsMap[m.id] ?? [],
  }));

  let bookmarkIds: string[] = [];
  let voteMap: Record<string, 'SUPPORT' | 'OPPOSE'> = {};
  if (user && listWithComments.length > 0) {
    const [bRes, vRes] = await Promise.all([
      supabase.from('bookmarks').select('mark_id').eq('user_id', user.id).in('mark_id', listWithComments.map((m) => m.id)),
      supabase.from('votes').select('mark_id, vote_type').eq('voter_id', user.id).in('mark_id', listWithComments.map((m) => m.id)),
    ]);
    bookmarkIds = (bRes.data ?? []).map((x) => x.mark_id);
    voteMap = Object.fromEntries((vRes.data ?? []).map((v) => [v.mark_id, v.vote_type as 'SUPPORT' | 'OPPOSE']));
  }

  return NextResponse.json({ marks: listWithComments, nextCursor, bookmarkIds, voteMap });
}
