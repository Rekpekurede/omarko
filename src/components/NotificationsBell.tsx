'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/notifications?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded p-1 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount != null && unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
