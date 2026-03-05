'use client';

import { useState, useEffect } from 'react';
import { MarkCard } from './MarkCard';
import type { Mark } from '@/lib/types';

interface FollowingFeedListProps {
  currentUserId: string | null;
  initialMarks?: Mark[];
  initialNextCursor?: string | null;
  initialBookmarkIds?: string[];
  initialVoteMap?: Record<string, 'SUPPORT' | 'OPPOSE'>;
}

export function FollowingFeedList({
  currentUserId,
  initialMarks = [],
  initialNextCursor = null,
  initialBookmarkIds = [],
  initialVoteMap = {},
}: FollowingFeedListProps) {
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null);
  const [voteMapState, setVoteMapState] = useState<Record<string, 'SUPPORT' | 'OPPOSE'>>(initialVoteMap);
  const [extraBookmarkIds, setExtraBookmarkIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(initialMarks.length === 0 && !!currentUserId);
  const allBookmarkIds = [...initialBookmarkIds, ...extraBookmarkIds];

  useEffect(() => {
    if (!currentUserId || initialMarks.length > 0) {
      setInitialLoad(false);
      return;
    }
    let cancelled = false;
    fetch('/api/feed?following=true&limit=20')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMarks(data.marks ?? []);
        setNextCursor(data.nextCursor ?? null);
        if (data.bookmarkIds?.length) setExtraBookmarkIds(data.bookmarkIds);
        if (data.voteMap && typeof data.voteMap === 'object') setVoteMapState(data.voteMap);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitialLoad(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, initialMarks.length]);

  const loadMore = async () => {
    if (!nextCursor || loading || !currentUserId) return;
    setLoading(true);
    const res = await fetch(`/api/feed?following=true&cursor=${encodeURIComponent(nextCursor)}&limit=20`);
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

  if (!currentUserId) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-base font-medium text-foreground">Following</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Sign in to see marks from people you follow.
        </p>
      </div>
    );
  }

  if (initialLoad) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <>
      <ul className="mt-4 space-y-4">
        {marks.map((mark) => (
          <li key={mark.id}>
            <MarkCard
              mark={mark}
              bookmarked={allBookmarkIds.includes(mark.id)}
              showBookmark={!!currentUserId}
              currentUserId={currentUserId}
              currentVote={voteMapState[mark.id] ?? null}
              canVote={!!currentUserId}
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
              onDeleted={(markId) => {
                setMarks((prev) => prev.filter((m) => m.id !== markId));
                setVoteMapState((prev) => {
                  const next = { ...prev };
                  delete next[markId];
                  return next;
                });
              }}
            />
          </li>
        ))}
      </ul>
      {marks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No marks from people you follow yet. Follow someone from their profile to see their marks here.
        </p>
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
