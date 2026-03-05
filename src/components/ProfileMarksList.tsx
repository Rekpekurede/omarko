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
  challengedOnly: boolean;
  currentUserId?: string | null;
}

export function ProfileMarksList({
  username,
  initialMarks,
  initialNextCursor,
  domain,
  claimType,
  challengedOnly,
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
    if (challengedOnly) params.set('disputed_only', 'true');
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
        <p className="py-8 text-center text-sm text-muted-foreground">No marks yet.</p>
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
