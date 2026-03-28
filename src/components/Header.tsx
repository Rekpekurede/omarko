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
    <header className="site-header sticky top-0 z-20 border-b border-white/10 bg-[var(--bg-primary)]/80 shadow-sm shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-[var(--bg-primary)]/75 dark:shadow-black/20">
      <div className="mx-auto w-full max-w-feed px-4 py-3.5 sm:px-4 sm:py-4">
        {/* Mobile header: balanced top row + properly proportioned search row */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <NavDrawer />
            <Link href="/" className="header-wordmark flex min-w-0 cursor-pointer items-center gap-2.5 transition-opacity duration-200 hover:opacity-90" aria-label="OMarko home">
              <div
                className="omarko-logo-mark h-9 w-9 shrink-0 rounded-md bg-[var(--bg-primary)]"
                aria-hidden
              />
              <span className="font-display text-xl font-semibold tracking-[-0.03em] text-[var(--accent)] leading-none whitespace-nowrap sm:text-[1.35rem]">
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
          <Link href="/" className="header-wordmark flex cursor-pointer items-center gap-2.5 transition-opacity duration-200 hover:opacity-90" aria-label="OMarko home">
            <div className="omarko-logo-mark h-9 w-9 shrink-0 rounded-md bg-[var(--bg-primary)]" aria-hidden />
            <span className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--accent)] leading-none">
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
              <Link href="/" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-all duration-200 hover:text-text-primary">
                Feed
              </Link>
              {user ? (
                <>
                  <NotificationsBell />
                  <CreateMarkButton />
                  {profile && (
                    <Link href={`/profile/${profile.username}`} className="header-nav-link cursor-pointer text-sm text-text-secondary transition-all duration-200 hover:text-text-primary">
                      Profile
                    </Link>
                  )}
                  <form action={signOut}>
                    <button type="submit" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-all duration-200 hover:text-text-primary">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/auth" className="header-nav-link cursor-pointer text-sm text-text-secondary transition-all duration-200 hover:text-text-primary">
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
