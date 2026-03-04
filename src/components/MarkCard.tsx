'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkStatusLabel } from './MarkStatusLabel';
import { BookmarkButton } from './BookmarkButton';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import { StatPill } from './StatPill';
import { ActionButtonGroup } from './ActionButtonGroup';
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
  const commentsLabel = commentsCount === 1 ? 'comment' : 'comments';

  return (
    <article className="w-full rounded-2xl border border-border bg-card p-4 transition hover:bg-accent/40">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-2">
            <Avatar username={username} avatarUrl={avatarUrl} size="sm" />
            <Link href={`/profile/${encodeURIComponent(username)}`} className="text-sm font-medium text-foreground hover:underline">
              @{username}
            </Link>
            <RelativeTime dateString={mark.created_at} className="ml-auto text-xs text-muted-foreground" />
            {mark.status !== 'ACTIVE' && (
              <MarkStatusLabel status={mark.status} />
            )}
            {isWithdrawn && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Withdrawn
              </span>
            )}
          </div>
          {mark.content && (
            <p className="text-base leading-relaxed text-foreground">{mark.content}</p>
          )}
          {mark.image_url && (
            <Link href={`/mark/${mark.id}`} className="block">
              <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mark.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Tap image to expand</p>
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {mark.domain && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                {mark.domain}
              </span>
            )}
            {mark.claim_type && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                {mark.claim_type}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <StatPill label="support" value={supportVotes} />
        <StatPill label="oppose" value={opposeVotes} />
        <StatPill label="disputes" value={mark.dispute_count ?? 0} />
        <StatPill label={commentsLabel} value={commentsCount} />
        <span className="text-xs text-muted-foreground">
          {vote === 'SUPPORT' ? (isOwnMark ? 'Supported (you)' : 'Supported') : vote === 'OPPOSE' ? 'Opposed' : 'No vote'}
        </span>
      </div>
      <ActionButtonGroup>
        {canVote && !isWithdrawn && (
          <>
            <button
              type="button"
              onClick={() => handleVote('SUPPORT')}
              disabled={pending}
              className={`min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                vote === 'SUPPORT'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground hover:bg-accent/70'
              }`}
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => handleVote('OPPOSE')}
              disabled={pending || isOwnMark}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                vote === 'OPPOSE'
                  ? 'border-foreground bg-accent text-foreground'
                  : 'border-border bg-card text-foreground hover:bg-accent/70'
              }`}
            >
              Oppose
            </button>
          </>
        )}
        <Link
          href={`/mark/${mark.id}?tab=comments`}
          className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent/70"
        >
          Reply
        </Link>
        {showDisputeButton && !isWithdrawn && (
          <Link
            href={`/mark/${mark.id}`}
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Dispute
          </Link>
        )}
      </ActionButtonGroup>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link href={`/mark/${mark.id}?tab=comments`} className="text-xs text-muted-foreground hover:underline">
          View all comments
        </Link>
        {showBookmark && <BookmarkButton markId={mark.id} bookmarked={bookmarked} />}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {toast && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{toast}</p>}
    </article>
  );
}
