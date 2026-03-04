'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';

interface NotificationRow {
  id: string;
  type: string;
  mark_id: string | null;
  actor_id: string | null;
  actor_username?: string | null;
  actor_avatar_url?: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsListProps {
  initialNotifications: NotificationRow[];
  initialNextCursor: string | null;
  initialUnreadCount: number;
}

export function NotificationsList({
  initialNotifications,
  initialNextCursor,
  initialUnreadCount,
}: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const notifyUnreadChanged = () => {
    window.dispatchEvent(new Event('notifications:changed'));
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    notifyUnreadChanged();
  };

  const destinationFor = (n: NotificationRow) => {
    if (n.mark_id) return `/mark/${n.mark_id}`;
    if (n.type === 'follow' && n.actor_username) {
      return `/profile/${encodeURIComponent(n.actor_username)}`;
    }
    return null;
  };

  const handleClick = (n: NotificationRow) => {
    if (!n.read_at) markAsRead(n.id);
    const destination = destinationFor(n);
    if (destination) router.push(destination);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
    setMarkingAll(false);
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      notifyUnreadChanged();
      router.refresh();
    }
  };

  useEffect(() => {
    if (initialUnreadCount > 0) {
      markAllRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const res = await fetch(`/api/notifications?cursor=${encodeURIComponent(nextCursor)}&limit=20`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.notifications?.length) {
      setNotifications((prev) => [...prev, ...data.notifications]);
      setNextCursor(data.nextCursor ?? null);
    }
  };

  const notificationText = (n: NotificationRow) => {
    const actor = n.actor_username ? `@${n.actor_username}` : 'Someone';
    switch (n.type) {
      case 'vote_support':
        return `${actor} supported your mark`;
      case 'vote_oppose':
        return `${actor} opposed your mark`;
      case 'comment':
      case 'COMMENT_CREATED':
        return `${actor} replied to your post`;
      case 'dispute_raised':
      case 'DISPUTE_CREATED':
        return `${actor} challenged your claim`;
      case 'follow':
        return `${actor} followed you`;
      case 'MARK_CHAMPION':
        return 'Your mark became champion';
      case 'MARK_SUPPLANTED':
        return 'Your mark was supplanted';
      case 'MARK_WITHDRAWN':
        return 'Your mark was withdrawn';
      default:
        return 'You have a new alert';
    }
  };

  const hasUnread = unreadCount > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
      </p>
      {hasUnread && (
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          {markingAll ? 'Marking…' : 'Mark all read'}
        </button>
      )}
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => handleClick(n)}
              className={`w-full rounded-xl border border-border p-3 text-left transition hover:bg-accent ${
                n.read_at ? 'bg-card text-muted-foreground' : 'bg-muted/80 text-foreground'
              }`}
            >
              <span className="flex items-center gap-3">
                <Avatar username={n.actor_username ?? 'user'} avatarUrl={n.actor_avatar_url ?? null} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read_at ? 'font-normal' : 'font-medium'}`}>
                    {notificationText(n)}
                  </span>
                  <span className="mt-0.5 inline-flex items-center text-xs text-muted-foreground">
                    <RelativeTime dateString={n.created_at} />
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {notifications.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No alerts yet.</p>
      )}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
