import { createClient } from '@/lib/supabase/server';
import { FeedFilters } from '@/components/FeedFilters';
import { FeedList } from '@/components/FeedList';
import { FeedTabs } from '@/components/FeedTabs';
import { FollowingFeedList } from '@/components/FollowingFeedList';
import { DOMAINS, CLAIM_TYPES, type Mark } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export const revalidate = 0;

const FEED_LIMIT = 20;

export type FeedSource = 'all' | 'user' | 'historical';

interface PageProps {
  searchParams: Promise<{ domain?: string; claim_type?: string; disputed_only?: string; source?: string; tab?: string }>;
}

export default async function FeedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const domain = params.domain ?? 'all';
  const claimType = params.claim_type ?? 'all';
  const disputedOnly = params.disputed_only === 'true';
  const tab = params.tab === 'following' ? 'following' : 'for_you';
  const source: FeedSource = params.source === 'historical' ? 'historical' : params.source === 'user' ? 'user' : 'all';

  const supabase = await createClient();
  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (source === 'historical') {
    query = query.not('historical_profile_id', 'is', null);
  } else if (source === 'user') {
    query = query.is('historical_profile_id', null);
  }
  if (domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    query = query.eq('domain', domain);
  }
  if (claimType !== 'all' && CLAIM_TYPES.includes(claimType as (typeof CLAIM_TYPES)[number])) {
    query = query.eq('claim_type', claimType);
  }
  if (disputedOnly) {
    query = query.gt('dispute_count', 0);
  }

  const { data: marks, error } = await query;
  if (error) {
    console.error('[FeedPage] Supabase error:', error.message);
  }
  const list = marks ?? [];
  const nextCursor = list.length === FEED_LIMIT && list[list.length - 1]
    ? list[list.length - 1].id
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

  const { data: { user } } = await supabase.auth.getUser();
  let bookmarkIds: string[] = [];
  let voteMap: Record<string, 'SUPPORT' | 'OPPOSE'> = {};
  if (user) {
    const [bookmarksRes, votesRes] = await Promise.all([
      supabase.from('bookmarks').select('mark_id').eq('user_id', user.id),
      supabase.from('votes').select('mark_id, vote_type').eq('voter_id', user.id),
    ]);
    bookmarkIds = (bookmarksRes.data ?? []).map((x) => x.mark_id);
    voteMap = Object.fromEntries(
      (votesRes.data ?? []).map((v) => [v.mark_id, v.vote_type as 'SUPPORT' | 'OPPOSE'])
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-white">Feed</h1>
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </div>
      )}
      <FeedTabs />
      <FeedFilters
        currentDomain={domain}
        currentClaimType={claimType}
        challengedOnly={disputedOnly}
      />
      {tab === 'following' ? (
        <FollowingFeedList
          currentUserId={user?.id ?? null}
          initialBookmarkIds={bookmarkIds}
          initialVoteMap={voteMap}
        />
      ) : (
        <FeedList
          key={`${domain}-${claimType}-${disputedOnly}-${source}`}
          initialMarks={listWithComments as unknown as Mark[]}
          initialNextCursor={nextCursor}
          domain={domain}
          claimType={claimType}
          source={source}
          disputedOnly={disputedOnly}
          bookmarkIds={bookmarkIds}
          voteMap={voteMap}
          showBookmark={!!user}
          currentUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}
