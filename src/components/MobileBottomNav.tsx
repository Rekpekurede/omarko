'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

interface MobileBottomNavProps {
  isSignedIn: boolean;
  username: string | null;
}

type NavItemProps = {
  href?: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  icon: ReactNode;
};

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

function NavItem({ href, label, active, onClick, icon }: NavItemProps) {
  const classes = `flex min-w-[3.9rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition ${
    active
      ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-black'
      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
  }`;

  const content = (
    <>
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

export function MobileBottomNav({ isSignedIn, username }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { openCreateModal } = useCreateMarkModal();

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 sm:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between rounded-2xl border border-gray-200/90 bg-white/90 px-2 py-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur-md dark:border-gray-800/90 dark:bg-gray-950/90">
          <NavItem href="/" label="Feed" active={isActive(pathname, '/')} icon="◉" />
          <NavItem href="/search" label="Search" active={isActive(pathname, '/search')} icon="⌕" />
          {isSignedIn ? (
            <>
              <NavItem label="Create" active={false} onClick={openCreateModal} icon="+" />
              <NavItem href="/notifications" label="Alerts" active={isActive(pathname, '/notifications')} icon="◌" />
              <NavItem
                href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                label="Profile"
                active={isActive(pathname, '/profile')}
                icon="◍"
              />
            </>
          ) : (
            <NavItem href="/auth" label="Sign in" active={isActive(pathname, '/auth')} icon="→" />
          )}
        </div>
      </nav>
    </>
  );
}
