import { createClient } from '@/lib/supabase/server';
import { FeedFilters } from '@/components/FeedFilters';
import { FeedList } from '@/components/FeedList';
import { FeedIntroBanner } from '@/components/FeedIntroBanner';
import { FeedTabs } from '@/components/FeedTabs';
import { FollowingFeedList } from '@/components/FollowingFeedList';
import { PageContainer } from '@/components/PageContainer';
import { DOMAINS } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';
import { getSignedMediaForMarkIds } from '@/lib/markMedia';

export const revalidate = 0;

const FEED_LIMIT = 20;

interface PageProps {
  searchParams: Promise<{ domain?: string; claim_type?: string; disputed_only?: string }>;
}

export default async function FeedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const domain = params.domain ?? 'all';
  const claimType = params.claim_type ?? 'all';
  const challengedOnly = params.disputed_only === 'true';

  const supabase = await createClient();
  const { data: claimTypeOptions } = await supabase
    .from('claim_types')
    .select('id, name')
    .order('name', { ascending: true });
  const claimTypeIdToName = new Map((claimTypeOptions ?? []).map((x) => [x.id, x.name]));

  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    query = query.eq('domain', domain);
  }
  if (claimType !== 'all') {
    const claimTypeName = claimTypeIdToName.get(claimType) ?? claimType;
    query = query.eq('claim_type', claimTypeName);
  }
  if (challengedOnly) {
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
  if (markIds.length > 0) {
    const [commentsRes, soiRes] = await Promise.all([
      supabase.from('comments').select('mark_id').in('mark_id', markIds),
      supabase.from('signs_of_influence').select('mark_id').in('mark_id', markIds),
    ]);
    for (const row of commentsRes.data ?? []) {
      commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
    }
    for (const row of soiRes.data ?? []) {
      soiCountMap[row.mark_id] = (soiCountMap[row.mark_id] ?? 0) + 1;
    }
  }
  const mediaByMarkId = await getSignedMediaForMarkIds(supabase, markIds);
  const listWithCounts = list.map((m) => ({
    ...m,
    comments_count: commentsCountMap[m.id] ?? 0,
    soi_count: soiCountMap[m.id] ?? 0,
    media: mediaByMarkId[m.id] ?? [],
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
    <PageContainer className="space-y-4">
      <FeedIntroBanner />
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Marks</h1>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </div>
      )}
      <FeedTabs
        followingContent={<FollowingFeedList currentUserId={user?.id ?? null} />}
      >
        <FeedFilters
          currentDomain={domain}
          currentClaimType={claimType}
          claimTypeOptions={claimTypeOptions ?? []}
          challengedOnly={challengedOnly}
        />
        <FeedList
          key={`${domain}-${claimType}-${challengedOnly}`}
          initialMarks={listWithCounts}
          initialNextCursor={nextCursor}
          domain={domain}
          claimType={claimType}
          challengedOnly={challengedOnly}
          bookmarkIds={bookmarkIds}
          voteMap={voteMap}
          showBookmark={!!user}
          currentUserId={user?.id ?? null}
        />
      </FeedTabs>
    </PageContainer>
  );
}
