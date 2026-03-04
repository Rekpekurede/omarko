'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkStatusLabel } from './MarkStatusLabel';
import { BookmarkButton } from './BookmarkButton';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import type { Mark } from '@/lib/types';

interface MarkCardProps {
  mark: Mark;
  showDisputeButton?: boolean;
  bookmarked?: boolean;
  showBookmark?: boolean;
  currentUserId?: string | null;
  currentVote?: 'SUPPORT' | 'OPPOSE' | null;
  canVote?: boolean;
  onVoteUpdate?: (updatedMark: Partial<Mark>) => void;
  onVoteSuccess?: (markId: string, newVote: 'SUPPORT' | 'OPPOSE' | null) => void;
}

function getProfile(profiles: Mark['profiles']): { username: string; avatar_url?: string | null } | null {
  if (!profiles) return null;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return p ? { username: p.username, avatar_url: (p as { avatar_url?: string | null }).avatar_url } : null;
}

export function MarkCard({
  mark,
  showDisputeButton = true,
  bookmarked = false,
  showBookmark = false,
  currentUserId = null,
  currentVote = null,
  canVote = false,
  onVoteUpdate,
  onVoteSuccess,
}: MarkCardProps) {
  const profile = getProfile(mark.profiles);
  const username = profile?.username ?? 'unknown';
  const avatarUrl = profile?.avatar_url ?? null;
  const isWithdrawn = !!mark.withdrawn_at;

  const [supportVotes, setSupportVotes] = useState(mark.support_votes ?? 0);
  const [opposeVotes, setOpposeVotes] = useState(mark.oppose_votes ?? 0);
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isOwnMark = !!currentUserId && currentUserId === mark.user_id;

  const handleVote = async (nextVote: 'SUPPORT' | 'OPPOSE') => {
    if (!canVote || pending) return;
    if (isOwnMark && nextVote === 'OPPOSE') {
      setToast('You cannot oppose your own mark.');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setError(null);
    setPending(true);

    const res = await fetch(`/api/marks/${mark.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType: nextVote }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Vote failed');
      if (res.status === 400 && typeof data.error === 'string' && data.error.toLowerCase().includes('cannot oppose your own')) {
        setToast(data.error);
        setTimeout(() => setToast(null), 2200);
      }
      setPending(false);
      return;
    }
    if (data) {
      setSupportVotes(data.support_votes ?? supportVotes);
      setOpposeVotes(data.oppose_votes ?? opposeVotes);
      setVote(data.userVote ?? null);
      onVoteUpdate?.(data);
      onVoteSuccess?.(mark.id, data.userVote ?? null);
    }
    setPending(false);
  };

  const commentsCount = mark.comments_count ?? 0;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 pb-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar username={username} avatarUrl={avatarUrl} size="sm" />
            <Link href={`/profile/${encodeURIComponent(username)}`} className="font-medium text-black hover:underline dark:text-white">
              @{username}
            </Link>
            <RelativeTime dateString={mark.created_at} className="text-xs text-gray-500 dark:text-gray-400" />
            {mark.status !== 'ACTIVE' && (
              <MarkStatusLabel status={mark.status} />
            )}
            {isWithdrawn && (
              <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                Withdrawn
              </span>
            )}
          </div>
          {mark.image_url && (
            <Link href={`/mark/${mark.id}`} className="mt-2 block">
              <div className="relative aspect-video max-h-64 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mark.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            </Link>
          )}
          {mark.content && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-300">{mark.content}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {mark.domain && (
              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {mark.domain}
              </span>
            )}
            {mark.claim_type && (
              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {mark.claim_type}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
        <span>{supportVotes} support</span>
        <span>{opposeVotes} oppose</span>
        <span>
          {vote === 'SUPPORT' ? (isOwnMark ? 'Supported (you)' : 'Supported') : vote === 'OPPOSE' ? 'Opposed' : 'No vote'}
        </span>
        <span>{mark.dispute_count ?? 0} disputes</span>
        <Link href={`/mark/${mark.id}?tab=comments`} className="hover:underline">
          Comments: {commentsCount}
        </Link>
        {canVote && !isWithdrawn && (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVote('SUPPORT')}
              disabled={pending}
              className={`min-h-[44px] min-w-[44px] rounded px-3 py-2 text-xs font-medium disabled:opacity-50 touch-manipulation ${
                vote === 'SUPPORT' ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => handleVote('OPPOSE')}
              disabled={pending || isOwnMark}
              className={`min-h-[44px] min-w-[44px] rounded px-3 py-2 text-xs font-medium disabled:opacity-50 touch-manipulation ${
                vote === 'OPPOSE' ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Oppose
            </button>
          </span>
        )}
        {showBookmark && <BookmarkButton markId={mark.id} bookmarked={bookmarked} />}
        <Link
          href={`/mark/${mark.id}?tab=comments`}
          className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reply
        </Link>
        {showDisputeButton && !isWithdrawn && (
          <Link
            href={`/mark/${mark.id}`}
            className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Dispute
          </Link>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {toast && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{toast}</p>}
    </article>
  );
}
