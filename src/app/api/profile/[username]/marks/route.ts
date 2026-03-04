import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const uname = decodeURIComponent(username);

  const { data: profileRows } = await supabase.rpc('get_profile_by_username', { p_username: uname });
  const profile = profileRows?.[0] ?? null;
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const claimType = searchParams.get('claim_type');
  const challengedOnly = searchParams.get('disputed_only') === 'true';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);

  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .eq('user_id', profile.id)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false });

  if (domain && domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    query = query.eq('domain', domain);
  }
  if (claimType && claimType !== 'all' && CLAIM_TYPES.includes(claimType as (typeof CLAIM_TYPES)[number])) {
    query = query.eq('claim_type', claimType);
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
        .eq('user_id', profile.id)
        .single();
      if (row) query = query.lt('created_at', row.created_at);
    }
  }
  query = query.limit(limit);

  const { data: marks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const list = (marks ?? []).map((m) => ({ ...m, profiles: { username: profile.username } }));
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
  }
  const listWithCounts = list.map((m) => ({ ...m, comments_count: commentsCountMap[m.id] ?? 0 }));
  const nextCursor = listWithCounts.length === limit && listWithCounts[listWithCounts.length - 1]
    ? encodeURIComponent(listWithCounts[listWithCounts.length - 1].id)
    : null;
  return NextResponse.json({ marks: listWithCounts, nextCursor });
}
