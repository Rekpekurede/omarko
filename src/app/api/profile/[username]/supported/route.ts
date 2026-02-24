import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
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
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);

  let query = supabase
    .from('votes')
    .select('mark_id')
    .eq('voter_id', profile.id)
    .eq('vote_type', 'SUPPORT')
    .order('created_at', { ascending: false });

  if (cursor) {
    const decoded = decodeURIComponent(cursor);
    if (/^[0-9a-f-]{36}$/i.test(decoded)) {
      const { data: row } = await supabase
        .from('votes')
        .select('created_at')
        .eq('voter_id', profile.id)
        .eq('vote_type', 'SUPPORT')
        .eq('mark_id', decoded)
        .single();
      if (row) query = query.lt('created_at', row.created_at);
    }
  }
  query = query.limit(limit);

  const { data: votes } = await query;
  const markIds = (votes ?? []).map((v) => v.mark_id);
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
  const withProfile = sorted.map((m) => ({ ...m, profiles: { username: (m.profiles as { username?: string })?.username ?? profile.username } }));
  const nextCursor = withProfile.length === limit && withProfile[withProfile.length - 1]
    ? encodeURIComponent(withProfile[withProfile.length - 1].id)
    : null;

  return NextResponse.json({ marks: withProfile, nextCursor });
}
