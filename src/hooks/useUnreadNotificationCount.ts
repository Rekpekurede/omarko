'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Returns unread notification count for the current user. Updates on mount,
 * visibility change, window event 'notifications:changed', and optional realtime + poll.
 * Same source used by desktop bell and mobile bottom nav.
 */
export function useUnreadNotificationCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  const refetch = useCallback(() => {
    fetch('/api/notifications?limit=1')
      .then((res) => res.json())
      .then((data) => {
        const n = typeof data.unread_count === 'number' ? data.unread_count : data.unreadCount;
        setCount(typeof n === 'number' ? n : 0);
      })
      .catch(() => setCount(null));
  }, []);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    const supabase = createClient();

    refetch();
    const onVisibility = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVisibility);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return;
      channel = supabase
        .channel('notifications-count')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          refetch
        )
        .subscribe();
    });

    const interval = setInterval(refetch, 30000);
    const onChanged = () => refetch();
    window.addEventListener('notifications:changed', onChanged);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
      window.removeEventListener('notifications:changed', onChanged);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refetch]);

  return count;
}
