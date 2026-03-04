import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookmarksList } from '@/components/BookmarksList';
import { PageContainer } from '@/components/PageContainer';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export const revalidate = 0;

const LIMIT = 20;

export default async function BookmarksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('mark_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  const markIds = (bookmarks ?? []).map((b) => b.mark_id);
  let marks: Record<string, unknown>[] = [];
  if (markIds.length > 0) {
    const { data: m } = await supabase
      .from('marks')
      .select(MARK_WITH_OWNER_USERNAME_SELECT)
      .in('id', markIds)
      .is('withdrawn_at', null);
    const orderMap = new Map(markIds.map((id, i) => [id, i]));
    const sorted = (m ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    const sortedIds = sorted.map((row) => row.id as string);
    const commentsCountMap: Record<string, number> = {};
    if (sortedIds.length > 0) {
      const { data: commentRows, error: commentsErr } = await supabase
        .from('comments')
        .select('mark_id')
        .in('mark_id', sortedIds);
      if (!commentsErr) {
        for (const row of commentRows ?? []) {
          commentsCountMap[row.mark_id] = (commentsCountMap[row.mark_id] ?? 0) + 1;
        }
      }
    }
    marks = sorted.map((row) => ({ ...row, comments_count: commentsCountMap[row.id] ?? 0 }));
  }

  const nextCursor = markIds.length === LIMIT && markIds[markIds.length - 1]
    ? markIds[markIds.length - 1]
    : null;

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-2xl font-semibold">Bookmarks</h1>
      <BookmarksList
        initialMarks={marks as unknown as import('@/lib/types').Mark[]}
        initialNextCursor={nextCursor}
      />
    </PageContainer>
  );
}
