import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MarkCard } from '@/components/MarkCard';
import { PageContainer } from '@/components/PageContainer';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoricalProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: figure, error: figureError } = await supabase
    .from('historical_profiles')
    .select('id, name, bio, era, domain, avatar_url, created_at')
    .eq('id', id)
    .single();

  if (figureError || !figure) notFound();

  const { data: marks, error: marksError } = await supabase
    .from('marks')
    .select(MARK_WITH_OWNER_USERNAME_SELECT)
    .eq('historical_profile_id', id)
    .is('withdrawn_at', null)
    .order('created_at', { ascending: false });

  if (marksError) {
    console.error('[HistoricalProfilePage] marks error', marksError.message);
  }
  const markList = marks ?? [];

  const markIds = markList.map((m) => m.id);
  let soiTotal = 0;
  const commentsCountMap: Record<string, number> = {};
  const latestCommentsMap: Record<string, { username: string; content: string; created_at: string }[]> = {};
  if (markIds.length > 0) {
    const [soiRes, countRes, commentsRes] = await Promise.all([
      supabase
        .from('signs_of_influence')
        .select('mark_id')
        .in('mark_id', markIds),
      supabase.rpc('get_comment_counts_for_marks', { p_mark_ids: markIds }).then((r) => (r.error ? { data: [] } : r)),
      supabase
        .from('comments')
        .select('mark_id, content, created_at, profiles!comments_user_id_fkey(username)')
        .in('mark_id', markIds)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    soiTotal = soiRes.data?.length ?? 0;
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

  const listWithComments = markList.map((m) => ({
    ...m,
    comments_count: commentsCountMap[m.id] ?? 0,
    latest_comments: latestCommentsMap[m.id] ?? [],
  }));

  return (
    <PageContainer className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          {figure.avatar_url && (
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={figure.avatar_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {figure.name}
            </h1>
            <span className="mt-2 inline-flex items-center rounded-full border border-amber-500/70 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
              HISTORICAL FIGURE
            </span>
            {figure.era && (
              <p className="mt-2 text-sm text-muted-foreground">{figure.era}</p>
            )}
            {figure.domain && (
              <p className="text-sm text-muted-foreground">{figure.domain}</p>
            )}
            {figure.bio && (
              <p className="mt-3 text-base leading-relaxed text-foreground">{figure.bio}</p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{markList.length} Marks</span>
          <span>{soiTotal} Signs of influence</span>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Marks</h2>
        {listWithComments.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            No marks yet for this figure.
          </p>
        ) : (
          <ul className="space-y-4">
            {listWithComments.map((mark) => (
              <li key={mark.id}>
                <MarkCard
                  mark={mark as import('@/lib/types').Mark}
                  showDisputeButton={true}
                  showBookmark={false}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-foreground hover:underline">Back to feed</Link>
      </p>
    </PageContainer>
  );
}
