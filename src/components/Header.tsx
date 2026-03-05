import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/actions';
import { NotificationsBell } from './NotificationsBell';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { CreateMarkButton } from './CreateMarkButton';
import { NavDrawer } from './NavDrawer';

interface HeaderProps {
  brandFontClass?: string;
}

export async function Header({ brandFontClass }: HeaderProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { username: string; avatar_url?: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-3 py-2 sm:px-4">
        <NavDrawer username={profile?.username ?? null} avatarUrl={profile?.avatar_url ?? null} />
        <Link href="/" className="flex items-center gap-2" aria-label="OMarko home">
          <svg
            width="32"
            height="36"
            viewBox="0 0 32 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 fill-[#1A1408] dark:fill-[#C9A84C]"
            aria-hidden
          >
            {/* Palm — rounded base */}
            <rect x="6" y="19" width="20" height="16.5" rx="2.2" ry="1.8" />
            {/* Thumb — angled, shorter */}
            <ellipse cx="5" cy="15" rx="2.4" ry="5" transform="rotate(-25 5 15)" />
            {/* Index */}
            <ellipse cx="10" cy="7.5" rx="2" ry="6" />
            {/* Middle — tallest */}
            <ellipse cx="16" cy="5.5" rx="2" ry="6.5" />
            {/* Ring — slightly shorter */}
            <ellipse cx="22" cy="7" rx="2" ry="5.5" />
            {/* Pinky — shortest */}
            <ellipse cx="26" cy="9.5" rx="1.8" ry="4.5" />
            {/* Faint stamp crease */}
            <path d="M15 24v-4" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" className="stroke-[#1A1408] dark:stroke-[#C9A84C] opacity-40" />
          </svg>
          <span className={`text-xl font-semibold tracking-tight text-[#1A1408] dark:text-[#C9A84C] ${brandFontClass ?? ''}`}>
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
              aria-label="Bookmarks"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3h12v18l-6-4-6 4V3z" />
              </svg>
            </Link>
          )}
          <Link
            href="/search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <ThemeToggle />
          <nav className="hidden items-center gap-3 sm:flex">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Feed
          </Link>
          {user ? (
            <>
              <Link href="/bookmarks" className="text-sm text-muted-foreground hover:text-foreground">
                Bookmarks
              </Link>
              <NotificationsBell />
              <CreateMarkButton />
              {profile && (
                <Link href={`/profile/${profile.username}`} className="text-sm text-muted-foreground hover:text-foreground">
                  Profile
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          )}
        </nav>
        </div>
      </div>
    </header>
  );
}
