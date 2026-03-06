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
  const wrapperClasses = `tap-press flex min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition duration-150 ${
    active
      ? 'nav-item-active bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
  }`;

  const content = (
    <span className="nav-item-inner flex flex-col items-center justify-center gap-1">
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={wrapperClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={wrapperClasses}>
      {content}
    </button>
  );
}

export function MobileBottomNav({ isSignedIn, username }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { openCreateModal } = useCreateMarkModal();

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 sm:hidden">
        <div className="mobile-bottom-nav-bar mx-auto flex max-w-lg items-center justify-between gap-2 rounded-2xl border border-border bg-black/70 px-4 py-4 shadow-xl backdrop-blur-xl">
          <NavItem
            href="/"
            label="Home"
            active={isActive(pathname, '/')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            }
          />
          <NavItem
            href="/search"
            label="Search"
            active={isActive(pathname, '/search')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
            }
          />
          {isSignedIn ? (
            <>
              <NavItem
                label="Create"
                active={false}
                onClick={openCreateModal}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                }
              />
              <NavItem
                href="/notifications"
                label="Notifications"
                active={isActive(pathname, '/notifications')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M10 20a2 2 0 0 0 4 0" />
                  </svg>
                }
              />
              <NavItem
                href={username ? `/profile/${encodeURIComponent(username)}` : '/'}
                label="Profile"
                active={isActive(pathname, '/profile')}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                }
              />
            </>
          ) : (
            <NavItem
              href="/auth"
              label="Sign in"
              active={isActive(pathname, '/auth')}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h12" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              }
            />
          )}
        </div>
      </nav>
    </>
  );
}
