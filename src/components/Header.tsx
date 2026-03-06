import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions';
import { NotificationsBell } from './NotificationsBell';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { CreateMarkButton } from './CreateMarkButton';
import { NavDrawer } from './NavDrawer';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { username: string; avatar_url?: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    profile = data;
  }

  return (
    <header className="site-header sticky top-0 z-10 border-b border-border bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-feed items-center gap-4 px-4 py-4 sm:px-4">
        <NavDrawer />
        <Link href="/" className="flex items-center gap-2 cursor-pointer header-wordmark" aria-label="OMarko home">
          <Image
            src="/omarko-icon.png"
            alt="OMarko"
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
            priority
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            OMarko
          </span>
        </Link>
        <div className="hidden min-w-0 flex-1 sm:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {user && (
            <Link
              href="/bookmarks"
              className="header-icon inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary sm:hidden"
              aria-label="Bookmarks"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3h12v18l-6-4-6 4V3z" />
              </svg>
            </Link>
          )}
          <Link
            href="/search"
            className="header-icon inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary sm:hidden"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <ThemeToggle />
          <nav className="header-nav hidden items-center gap-3 sm:flex">
            <Link href="/" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
              Feed
            </Link>
            {user ? (
              <>
                <Link href="/bookmarks" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                  Bookmarks
                </Link>
                <NotificationsBell />
                <CreateMarkButton />
                {profile && (
                  <Link href={`/profile/${profile.username}`} className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                    Profile
                  </Link>
                )}
                <form action={signOut}>
                  <button type="submit" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/auth" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
