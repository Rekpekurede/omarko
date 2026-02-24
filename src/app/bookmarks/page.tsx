import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookmarksList } from '@/components/BookmarksList';
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
    marks = (m ?? []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }

  const nextCursor = markIds.length === LIMIT && markIds[markIds.length - 1]
    ? markIds[markIds.length - 1]
    : null;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Bookmarks</h1>
      <BookmarksList
        initialMarks={marks as unknown as import('@/lib/types').Mark[]}
        initialNextCursor={nextCursor}
      />
    </div>
  );
}
