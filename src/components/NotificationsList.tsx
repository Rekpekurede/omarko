'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface NotificationRow {
  id: string;
  type: string;
  mark_id: string | null;
  actor_id: string | null;
  message: string;
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
  void initialUnreadCount; // reserved for unread badge
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleClick = (n: NotificationRow) => {
    if (!n.read_at) markAsRead(n.id);
    if (n.mark_id) router.push(`/mark/${n.mark_id}`);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
    setMarkingAll(false);
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      router.refresh();
    }
  };

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

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="space-y-4">
      {hasUnread && (
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50"
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
              className={`w-full rounded border border-gray-200 p-3 text-left text-sm transition hover:bg-gray-50 ${
                n.read_at ? 'bg-white text-gray-600' : 'bg-gray-50 font-medium text-black'
              }`}
            >
              <span className="block">{n.message}</span>
              <span className="mt-1 block text-xs text-gray-500">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {notifications.length === 0 && (
        <p className="py-8 text-center text-gray-500">No notifications yet.</p>
      )}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded border border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
