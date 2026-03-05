'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  username: string | null;
  avatarUrl: string | null;
}

const menuItems = [
  { label: 'Profile', href: '/profile/', icon: '👤', useUsername: true },
  { label: 'Historical Figures', href: '/historical', icon: '🏛', useUsername: false },
  { label: 'Settings', href: '/settings', icon: '⚙️', useUsername: false },
  { label: 'Home', href: '/', icon: '🏠', useUsername: false },
] as const;

export function SideDrawer({ open, onClose, username, avatarUrl }: SideDrawerProps) {
  const handleLinkClick = () => onClose();

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[35] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed left-0 top-0 z-[40] h-full w-[280px] bg-[var(--drawer-bg)] shadow-xl transition-[transform] duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col p-4 pt-6">
          <div className="flex items-center justify-between pr-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar
                username={username ?? 'Guest'}
                avatarUrl={username ? avatarUrl : null}
                size="lg"
              />
              <span className="font-mono text-base font-semibold text-[#C9A84C] truncate">
                {username ? `@${username}` : 'Guest'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--drawer-menu-hover)] hover:text-foreground"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="my-4 h-px w-full border-b border-[#C9A84C] opacity-30" aria-hidden />

          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const href = item.useUsername
                ? (username ? `/profile/${encodeURIComponent(username)}` : '/auth')
                : item.href;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={handleLinkClick}
                  className="font-display flex items-center gap-3 rounded-r-lg border-l-4 border-transparent py-3 px-5 text-base text-foreground transition-colors hover:border-[#C9A84C] hover:bg-[var(--drawer-menu-hover)]"
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
