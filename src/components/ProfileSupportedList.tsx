'use client';

import { useState } from 'react';
import { MarkCard } from './MarkCard';
import type { Mark } from '@/lib/types';

interface ProfileSupportedListProps {
  username: string;
  initialMarks: Mark[];
  initialNextCursor: string | null;
  currentUserId?: string | null;
}

export function ProfileSupportedList({
  username,
  initialMarks,
  initialNextCursor,
  currentUserId = null,
}: ProfileSupportedListProps) {
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}/supported?cursor=${encodeURIComponent(nextCursor)}&limit=20`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.marks?.length) {
      setMarks((prev) => [...prev, ...data.marks]);
      setNextCursor(data.nextCursor ?? null);
    }
  };

  return (
    <>
      <ul className="space-y-4">
        {marks.map((mark) => (
          <li key={mark.id}>
            <MarkCard
              mark={mark}
              currentUserId={currentUserId}
              canVote={!!currentUserId}
              showBookmark={!!currentUserId}
              showChallengeButton={true}
              onDeleted={(markId: string) => setMarks((prev) => prev.filter((m) => m.id !== markId))}
            />
          </li>
        ))}
      </ul>
      {marks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No supported marks yet.</p>
      )}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent/70 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
