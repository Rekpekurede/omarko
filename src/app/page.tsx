import { createClient } from '@/lib/supabase/server';
import { FeedFilters } from '@/components/FeedFilters';
import { FeedList } from '@/components/FeedList';
import { PageContainer } from '@/components/PageContainer';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

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
  let query = supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  if (domain !== 'all' && DOMAINS.includes(domain as (typeof DOMAINS)[number])) {
    query = query.eq('domain', domain);
  }
  if (claimType !== 'all' && CLAIM_TYPES.includes(claimType as (typeof CLAIM_TYPES)[number])) {
    query = query.eq('claim_type', claimType);
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
      console.log('[FeedPage] comment counts sample', markIds.slice(0, 3).map((id) => ({ markId: id, comments_count: commentsCountMap[id] ?? 0 })));
    }
  }
  const listWithCounts = list.map((m) => ({ ...m, comments_count: commentsCountMap[m.id] ?? 0 }));

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
      <h1 className="text-2xl font-semibold text-foreground">Latest claims</h1>
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </div>
      )}
      <FeedFilters
        currentDomain={domain}
        currentClaimType={claimType}
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
    </PageContainer>
  );
}
