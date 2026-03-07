'use client';

import Link from 'next/link';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

export function NotificationsBell() {
  const unreadCount = useUnreadNotificationCount();

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:text-text-primary"
      aria-label={unreadCount != null && unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount != null && unreadCount > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-background"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
