'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';

export interface NotificationItem {
  id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  actor: { display_name: string; username: string; avatar_url: string | null };
  mark: { id: string; content: string } | null;
}

const ACTION_TEXT: Record<string, string> = {
  follow: 'followed you',
  support: 'supported your mark',
  oppose: 'opposed your mark',
  challenge: 'challenged your mark',
  comment: 'commented on your mark',
  soi: 'added a Sign of Influence to your mark',
};

function NotificationSkeleton() {
  return (
    <li className="flex animate-pulse items-start gap-3 rounded-xl border border-border bg-card p-3">
      <div className="h-10 w-10 shrink-0 rounded-[50%] bg-bg-secondary" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-bg-secondary" />
        <div className="h-3 w-1/2 rounded bg-bg-secondary" />
      </div>
    </li>
  );
}

export function NotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError('Failed to load notifications');
        return;
      }
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/notifications/read', { method: 'POST' })
      .then((res) => {
        if (res.ok) window.dispatchEvent(new Event('notifications:changed'));
      })
      .catch(() => {});
    fetchNotifications();
  }, [fetchNotifications]);

  const handleClick = (n: NotificationItem) => {
    const destination = n.mark ? `/mark/${n.mark.id}` : n.type === 'follow' ? `/profile/${encodeURIComponent(n.actor.username)}` : null;
    if (destination) router.push(destination);
  };

  const primaryText = (n: NotificationItem) => {
    const name = n.actor.display_name?.trim() || (n.actor.username ? `@${n.actor.username}` : 'Someone');
    const action = ACTION_TEXT[n.type] ?? 'interacted';
    return `${name} ${action}`;
  };

  const secondarySnippet = (n: NotificationItem) => {
    if (!n.mark?.content) return null;
    const text = n.mark.content.slice(0, 50);
    return text.length < n.mark.content.length ? `${text}…` : text;
  };

  if (loading) {
    return (
      <ul className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <NotificationSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        Something went wrong. Please try again later.
      </p>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        No notifications yet. When people interact with your marks, you&apos;ll see it here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {notifications.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => handleClick(n)}
            className={`w-full rounded-xl border border-border p-3 text-left transition hover:bg-bg-card-hover ${
              n.is_read ? 'bg-card text-[var(--text-muted)]' : 'border-l-4 border-l-[var(--accent)] bg-muted/50 text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar
                username={n.actor.username || 'user'}
                avatarUrl={n.actor.avatar_url ?? null}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className={`text-[0.95rem] ${n.is_read ? 'font-normal' : 'font-semibold'}`}>
                  {primaryText(n)}
                </p>
                {secondarySnippet(n) && (
                  <p className="mt-0.5 truncate text-[0.78rem] text-[var(--text-muted)]">
                    {secondarySnippet(n)}
                  </p>
                )}
                <p className="mt-1 text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                  <RelativeTime dateString={n.created_at} />
                </p>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
