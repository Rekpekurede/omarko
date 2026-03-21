import Link from 'next/link';
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
      <div className="mx-auto w-full max-w-feed px-4 py-4 sm:px-4">
        {/* Mobile header: balanced top row + properly proportioned search row */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <NavDrawer />
            <Link href="/" className="flex min-w-0 items-center gap-2 cursor-pointer header-wordmark" aria-label="OMarko home">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '6px',
                  flexShrink: 0,
                }}
                className="omarko-logo-mark bg-[var(--bg-primary)]"
                aria-hidden
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                OMarko
              </span>
            </Link>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-3 sm:hidden">
          <SearchBar />
        </div>

        {/* Desktop/tablet header: original single-row layout */}
        <div className="hidden sm:flex items-center gap-4">
          <NavDrawer />
          <Link href="/" className="flex items-center gap-2 cursor-pointer header-wordmark" aria-label="OMarko home">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '6px',
                flexShrink: 0,
              }}
              className="omarko-logo-mark bg-[var(--bg-primary)]"
              aria-hidden
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

          <div className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[460px] lg:max-w-[500px] px-2">
              <SearchBar />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <nav className="header-nav hidden items-center gap-3 sm:flex">
              <Link href="/" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-colors hover:text-text-primary">
                Feed
              </Link>
              {user ? (
                <>
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
      </div>
    </header>
  );
}
