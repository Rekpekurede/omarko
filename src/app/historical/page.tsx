import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MarkCard } from '@/components/MarkCard';
import { PageContainer } from '@/components/PageContainer';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const FEED_LIMIT = 20;

export default async function HistoricalFiguresPage() {
  const supabase = await createClient();

  const { data: marksWithProfiles } = await supabase
    .from('marks')
    .select('historical_profile_id, historical_profiles(id, name, era, domain)')
    .not('historical_profile_id', 'is', null)
    .is('withdrawn_at', null);

  const profileMap = new Map<string, { name: string; era: string | null; domain: string | null; count: number }>();
  for (const row of marksWithProfiles ?? []) {
    const id = row.historical_profile_id as string;
    const hpRaw = row.historical_profiles;
    const hp = (Array.isArray(hpRaw) ? hpRaw[0] : hpRaw) as { id: string; name: string; era: string | null; domain: string | null } | null;
    if (!id || !hp) continue;
    const existing = profileMap.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      profileMap.set(id, { name: hp.name, era: hp.era, domain: hp.domain, count: 1 });
    }
  }
  const figureCards = Array.from(profileMap.entries()).map(([id, p]) => ({ id, ...p }));

  const { data: feedMarks } = await supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .not('historical_profile_id', 'is', null)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  const list = feedMarks ?? [];
  const markIds = list.map((m) => m.id);
  const commentsCountMap: Record<string, number> = {};
  const latestCommentsMap: Record<string, { username: string; content: string; created_at: string }[]> = {};
  if (markIds.length > 0) {
    const [countRes, commentsRes] = await Promise.all([
      supabase.rpc('get_comment_counts_for_marks', { p_mark_ids: markIds }).then((r) => (r.error ? { data: [] } : r)),
      supabase
        .from('comments')
        .select('mark_id, content, created_at, profiles!comments_user_id_fkey(username)')
        .in('mark_id', markIds)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    for (const row of countRes.data ?? []) {
      commentsCountMap[row.mark_id] = Number(row.cnt ?? 0);
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
    }
  }

  const listWithComments = list.map((m) => ({
    ...m,
    comments_count: commentsCountMap[m.id] ?? 0,
    latest_comments: latestCommentsMap[m.id] ?? [],
  }));

  return (
    <PageContainer className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Historical Figures
        </h1>
        <p className="mt-1 text-muted-foreground">
          Marks left on the world by history&apos;s greatest minds.
        </p>
      </header>

      {figureCards.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Figures</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {figureCards.map((card) => (
              <Link
                key={card.id}
                href={`/historical/profile/${card.id}`}
                className="rounded-xl border border-border bg-bg-card p-4 transition-colors duration-150 hover:border-accent/50 hover:bg-accent-glow"
              >
                <p className="font-semibold text-foreground">{card.name}</p>
                {card.era && <p className="text-sm text-muted-foreground">{card.era}</p>}
                {card.domain && <p className="text-sm text-muted-foreground">{card.domain}</p>}
                <p className="mt-2 text-sm font-medium text-accent">
                  {card.count} Mark{card.count !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Latest marks</h2>
        {listWithComments.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No historical marks yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {listWithComments.map((mark) => (
              <li key={mark.id}>
                <MarkCard
                  mark={mark as unknown as import('@/lib/types').Mark}
                  showDisputeButton={true}
                  showBookmark={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
