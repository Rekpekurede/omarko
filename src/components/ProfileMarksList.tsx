'use client';

import { useState } from 'react';
import { MarkCard } from './MarkCard';
import type { Mark } from '@/lib/types';

interface ProfileMarksListProps {
  username: string;
  initialMarks: Mark[];
  initialNextCursor: string | null;
  domain: string;
  claimType: string;
  disputedOnly: boolean;
  currentUserId?: string | null;
}

export function ProfileMarksList({
  username,
  initialMarks,
  initialNextCursor,
  domain,
  claimType,
  disputedOnly,
  currentUserId = null,
}: ProfileMarksListProps) {
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (domain !== 'all') params.set('domain', domain);
    if (claimType !== 'all') params.set('claim_type', claimType);
    if (disputedOnly) params.set('disputed_only', 'true');
    params.set('cursor', nextCursor);
    params.set('limit', '20');
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}/marks?${params.toString()}`);
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
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">No marks yet.</p>
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
