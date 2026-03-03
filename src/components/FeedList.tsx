'use client';

import { useState } from 'react';
import { MarkCard } from './MarkCard';
import type { Mark } from '@/lib/types';

interface FeedListProps {
  initialMarks: Mark[];
  initialNextCursor: string | null;
  domain: string;
  claimType: string;
  disputedOnly: boolean;
  bookmarkIds?: string[];
  voteMap?: Record<string, 'SUPPORT' | 'OPPOSE'>;
  showBookmark?: boolean;
  currentUserId?: string | null;
}

export function FeedList({
  initialMarks,
  initialNextCursor,
  domain,
  claimType,
  disputedOnly,
  bookmarkIds: bookmarkIdsProp = [],
  voteMap: voteMapProp = {},
  showBookmark = false,
  currentUserId = null,
}: FeedListProps) {
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [voteMapState, setVoteMapState] = useState<Record<string, 'SUPPORT' | 'OPPOSE'>>(voteMapProp);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [extraBookmarkIds, setExtraBookmarkIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const allBookmarkIds = [...bookmarkIdsProp, ...extraBookmarkIds];

  const loadMore = async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (domain !== 'all') params.set('domain', domain);
    if (claimType !== 'all') params.set('claim_type', claimType);
    if (disputedOnly) params.set('disputed_only', 'true');
    params.set('cursor', nextCursor);
    params.set('limit', '20');
    const res = await fetch(`/api/feed?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.marks?.length) {
      setMarks((prev) => [...prev, ...data.marks]);
      setNextCursor(data.nextCursor ?? null);
      if (data.bookmarkIds?.length) {
        setExtraBookmarkIds((prev) => Array.from(new Set([...prev, ...data.bookmarkIds])));
      }
      if (data.voteMap && typeof data.voteMap === 'object') {
        setVoteMapState((prev) => ({ ...prev, ...data.voteMap }));
      }
    }
  };

  return (
    <>
      <ul className="mt-4 space-y-4">
        {marks.map((mark) => (
          <li key={mark.id}>
            <MarkCard
              mark={mark}
              bookmarked={allBookmarkIds.includes(mark.id)}
              showBookmark={showBookmark}
              currentVote={voteMapState[mark.id] ?? null}
              canVote={!!currentUserId && currentUserId !== mark.user_id}
              onVoteUpdate={(updated) => {
                if (updated.support_votes !== undefined || updated.oppose_votes !== undefined) {
                  setMarks((prev) =>
                    prev.map((m) =>
                      m.id === mark.id
                        ? { ...m, support_votes: updated.support_votes ?? m.support_votes, oppose_votes: updated.oppose_votes ?? m.oppose_votes }
                        : m
                    )
                  );
                }
              }}
              onVoteSuccess={(markId, newVote) => {
                setVoteMapState((prev) => {
                  if (!newVote) {
                    const next = { ...prev };
                    delete next[markId];
                    return next;
                  }
                  return { ...prev, [markId]: newVote };
                });
              }}
            />
          </li>
        ))}
      </ul>
      {marks.length === 0 && (
        <p className="py-8 text-center text-gray-500">No marks yet.</p>
      )}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="min-h-[44px] touch-manipulation rounded border border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
