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
              canVote={!!currentUserId && currentUserId !== mark.user_id}
              showDisputeButton={true}
            />
          </li>
        ))}
      </ul>
      {marks.length === 0 && (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">No supported marks yet.</p>
      )}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
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
    </>
  );
}
