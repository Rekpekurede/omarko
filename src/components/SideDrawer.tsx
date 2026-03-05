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
  const router = useRouter();

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

  const handleLinkClick = (href: string, useUsername: boolean) => {
    onClose();
    if (useUsername && username) router.push(`/profile/${encodeURIComponent(username)}`);
    else router.push(href);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed left-0 top-0 z-50 h-full w-[85vw] max-w-[280px] bg-[#F5F2EC] shadow-xl transition-transform duration-300 ease-out dark:bg-[#0A0A0F] ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col p-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar
              username={username ?? 'Guest'}
              avatarUrl={username ? avatarUrl : null}
              size="lg"
            />
            <span className="text-lg font-semibold text-[#C9A84C]">
              {username ? `@${username}` : 'Guest'}
            </span>
          </div>

          <div className="my-4 h-px w-full bg-[#C9A84C]" aria-hidden />

          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const href = item.useUsername && username
                ? `/profile/${encodeURIComponent(username)}`
                : item.href;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={() => onClose()}
                  className="flex items-center gap-3 rounded-lg border-l-4 border-transparent py-3 pl-3 pr-4 text-left text-foreground transition-colors hover:border-[#C9A84C] hover:bg-[#C9A84C]/10 dark:hover:bg-[#C9A84C]/15"
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
