import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MarkCard } from '@/components/MarkCard';
import { SearchBar } from '@/components/SearchBar';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const term = q?.trim() ?? '';
  const supabase = await createClient();

  let profiles: { id: string; username: string }[] = [];
  let marks: Record<string, unknown>[] = [];
  let bookmarkIds: string[] = [];

  if (term.length >= 2) {
    const searchTerm = `%${term}%`;
    const [pRes, mRes] = await Promise.all([
      supabase.from('profiles').select('id, username').ilike('username', searchTerm).limit(10),
      supabase
        .from('marks')
        .select(MARK_WITH_OWNER_USERNAME_SELECT)
        .is('withdrawn_at', null)
        .ilike('content', searchTerm)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    profiles = pRes.data ?? [];
    marks = mRes.data ?? [];
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (user && marks.length > 0) {
    const { data: b } = await supabase.from('bookmarks').select('mark_id').eq('user_id', user.id).in('mark_id', marks.map((m) => (m as { id: string }).id));
    bookmarkIds = (b ?? []).map((x) => x.mark_id);
  }
  const showBookmark = !!user;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Search</h1>
      <SearchBar initialQuery={term} />
      {term && (
        <div className="mt-6 space-y-6">
          {profiles.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Profiles</h2>
              <ul className="space-y-2">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <Link href={`/profile/${p.username}`} className="font-medium text-black hover:underline">
                      @{p.username}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {marks.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Marks</h2>
              <ul className="space-y-4">
                {marks.map((m) => (
                  <li key={(m as { id: string }).id}>
                    <MarkCard
                      mark={m as unknown as import('@/lib/types').Mark}
                      bookmarked={bookmarkIds.includes((m as { id: string }).id)}
                      showBookmark={showBookmark}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {term && profiles.length === 0 && marks.length === 0 && (
            <p className="text-gray-500">No profiles or marks found.</p>
          )}
        </div>
      )}
    </div>
  );
}
