import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions';
import { NotificationsBell } from './NotificationsBell';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { CreateMarkButton } from './CreateMarkButton';

interface HeaderProps {
  brandFontClass?: string;
}

export async function Header({ brandFontClass }: HeaderProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { username: string } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className={`text-xl font-semibold tracking-tight text-black dark:text-white ${brandFontClass ?? ""}`}>
            OMarko
          </Link>
          <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
            Feed
          </Link>
          {user ? (
            <>
              <Link href="/bookmarks" className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
                Bookmarks
              </Link>
              <NotificationsBell />
              <ThemeToggle />
              <CreateMarkButton />
              {profile && (
                <Link href={`/profile/${profile.username}`} className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  Profile
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className="text-sm text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white">
              Sign in
            </Link>
          )}
        </nav>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
