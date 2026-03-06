'use client';

import { useState } from 'react';
import { MarkCard } from './MarkCard';
import { MarkCardSkeleton } from './MarkCardSkeleton';
import type { Mark } from '@/lib/types';
import type { FeedSource } from '@/app/page';

interface FeedListProps {
  initialMarks: Mark[];
  initialNextCursor: string | null;
  domain: string;
  claimType: string;
  source: FeedSource;
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
  source = 'all',
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
    if (source !== 'all') params.set('source', source);
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
      <ul className="mt-8 space-y-8">
        {marks.map((mark) => (
          <li key={mark.id} className="animate-feed-in">
            <MarkCard
              mark={mark}
              bookmarked={allBookmarkIds.includes(mark.id)}
              showBookmark={showBookmark}
              currentVote={voteMapState[mark.id] ?? null}
              canVote={!!currentUserId}
              currentUserId={currentUserId}
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
                setVoteMapState((prev) => ({ ...prev, [markId]: newVote }));
              }}
            />
          </li>
        ))}
      </ul>
      {loading && (
        <div className="space-y-8">
          <MarkCardSkeleton />
          <MarkCardSkeleton />
        </div>
      )}
      {marks.length === 0 && !loading && (
        <p className="py-16 text-center text-text-muted">No marks yet.</p>
      )}
      {nextCursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="btn-primary tap-press min-h-[48px] cursor-pointer rounded-[10px] px-8 py-3 text-sm font-semibold text-[#0a0a0a] disabled:opacity-50 disabled:transform-none"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
