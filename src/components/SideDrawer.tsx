'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useDrawer } from '@/context/DrawerContext';
import { signOut } from '@/lib/actions';
import { Avatar } from './Avatar';

interface SideDrawerProps {
  username: string | null;
  avatarUrl: string | null;
}

const menuItems = [
  { label: 'Home', href: '/', icon: '🏠', useUsername: false },
  { label: 'Profile', href: '/profile/', icon: '👤', useUsername: true },
  { label: 'Settings', href: '/settings', icon: '⚙️', useUsername: false },
] as const;

export function SideDrawer({ username, avatarUrl }: SideDrawerProps) {
  const { open, setOpen } = useDrawer();
  const onClose = useCallback(() => setOpen(false), [setOpen]);
  const handleLinkClick = onClose;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, setOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed inset-y-0 left-0 z-50 h-screen w-[280px] border-r border-border bg-bg-secondary shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="flex h-full flex-col p-6 pt-8">
          <div className="flex items-center justify-between pr-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar
                username={username ?? 'Guest'}
                avatarUrl={username ? avatarUrl : null}
                size="lg"
              />
              <span className="font-display text-base font-semibold text-accent truncate">
                {username ? `@${username}` : 'Guest'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:text-text-primary"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="my-4 h-px w-full border-b border-border" aria-hidden />

          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const href = item.useUsername
                ? (username ? `/profile/${encodeURIComponent(username)}` : '/auth')
                : item.href;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={handleLinkClick}
                  className="tap-press flex items-center gap-4 rounded-r-lg border-l-[3px] border-transparent py-4 px-6 text-text-secondary transition-colors duration-150 hover:border-accent hover:text-text-primary"
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <form action={signOut} className="border-l-[3px] border-transparent">
              <button
                type="submit"
                onClick={handleLinkClick}
                className="tap-press flex w-full items-center gap-4 rounded-r-lg py-4 px-6 text-left text-text-secondary transition-colors duration-150 hover:border-accent hover:text-text-primary"
              >
                <span className="text-xl" aria-hidden>🚪</span>
                <span>Sign out</span>
              </button>
            </form>
          </nav>
        </div>
      </div>
    </>
  );
}
