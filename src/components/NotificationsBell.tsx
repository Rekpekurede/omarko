'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refetchUnreadCount = useCallback(() => {
    fetch('/api/notifications?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.unread_count === 'number') {
          setUnreadCount(data.unread_count);
        } else if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    const supabase = createClient();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchUnreadCount();
    };

    refetchUnreadCount();
    document.addEventListener('visibilitychange', onVisibilityChange);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user?.id) return;
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => refetchUnreadCount()
        )
        .subscribe();
    });

    const interval = setInterval(refetchUnreadCount, 30000);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetchUnreadCount]);

  useEffect(() => {
    const onNotificationsChanged = () => refetchUnreadCount();
    window.addEventListener('notifications:changed', onNotificationsChanged);
    return () => window.removeEventListener('notifications:changed', onNotificationsChanged);
  }, [refetchUnreadCount]);

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
