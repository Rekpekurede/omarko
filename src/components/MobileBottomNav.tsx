'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

interface MobileBottomNavProps {
  isSignedIn: boolean;
  username: string | null;
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export function MobileBottomNav({ isSignedIn, username }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { openCreateModal } = useCreateMarkModal();

  return (
    <>
      {isSignedIn && (
        <button
          type="button"
          onClick={openCreateModal}
          className="sm:hidden fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-black text-xl font-semibold text-white shadow-lg hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          aria-label="Create mark"
        >
          +
        </button>
      )}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          <Link
            href="/"
            className={`rounded px-2 py-1 text-xs font-medium ${
              isActive(pathname, '/') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Feed
          </Link>
          <Link
            href="/search"
            className={`rounded px-2 py-1 text-xs font-medium ${
              isActive(pathname, '/search') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Search
          </Link>
          {isSignedIn ? (
            <>
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Create
              </button>
              <Link
                href="/notifications"
                className={`rounded px-2 py-1 text-xs font-medium ${
                  isActive(pathname, '/notifications') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Alerts
              </Link>
              <Link
                href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  isActive(pathname, '/profile') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Profile
              </Link>
            </>
          ) : (
            <Link
              href="/auth"
              className={`rounded px-2 py-1 text-xs font-medium ${
                isActive(pathname, '/auth') ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
