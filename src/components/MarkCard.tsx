'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MarkStatusLabel } from './MarkStatusLabel';
import { BookmarkButton } from './BookmarkButton';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import { ActionButtonGroup } from './ActionButtonGroup';
import type { Mark } from '@/lib/types';

interface MarkCardProps {
  mark: Mark;
  showChallengeButton?: boolean;
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
  showChallengeButton = true,
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isOwnMark = !!currentUserId && currentUserId === mark.user_id;

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

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
    <article className="w-full rounded-xl border border-border bg-card p-5 transition hover:bg-accent/40">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center gap-2.5">
            <Avatar username={username} avatarUrl={avatarUrl} size="md" />
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
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full text-left"
              aria-label="Open image preview"
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mark.image_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {mark.domain && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {mark.domain}
              </span>
            )}
            {mark.claim_type && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {mark.claim_type}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">👍 {supportVotes}</span>
        <span className="inline-flex items-center gap-1">👎 {opposeVotes}</span>
        <span className="inline-flex items-center gap-1">⚔ {mark.dispute_count ?? 0}</span>
        <span className="inline-flex items-center gap-1">💬 {commentsCount}</span>
        <span className="ml-auto hidden sm:inline">
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
              className={`min-h-[40px] rounded-lg px-2.5 py-2 text-xs font-medium transition disabled:opacity-50 ${
                vote === 'SUPPORT'
                  ? 'bg-foreground text-background'
                  : 'border border-border bg-card text-foreground hover:bg-accent'
              }`}
            >
              👍 Support
            </button>
            <button
              type="button"
              onClick={() => handleVote('OPPOSE')}
              disabled={pending || isOwnMark}
              className={`min-h-[40px] rounded-lg border px-2.5 py-2 text-xs font-medium transition disabled:opacity-50 ${
                vote === 'OPPOSE'
                  ? 'border-foreground bg-accent text-foreground'
                  : 'border-border bg-card text-foreground hover:bg-accent'
              }`}
            >
              👎 Oppose
            </button>
          </>
        )}
        {!canVote && (
          <>
            <span className="min-h-[40px] rounded-lg border border-transparent px-2.5 py-2 text-xs text-muted-foreground" />
            <span className="min-h-[40px] rounded-lg border border-transparent px-2.5 py-2 text-xs text-muted-foreground" />
          </>
        )}
        <Link
          href={`/mark/${mark.id}?tab=comments`}
          className="flex min-h-[40px] items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          💬 Reply
        </Link>
        {showChallengeButton && !isWithdrawn && (
          <Link
            href={`/mark/${mark.id}`}
            className="flex min-h-[40px] items-center justify-center rounded-lg border border-border bg-muted px-2.5 py-2 text-xs font-medium text-foreground transition hover:bg-accent"
          >
            ⚔ Challenge
          </Link>
        )}
      </ActionButtonGroup>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link href={`/mark/${mark.id}?tab=comments`} className="text-xs text-muted-foreground hover:underline">
          View all {commentsLabel}
        </Link>
        {showBookmark && <BookmarkButton markId={mark.id} bookmarked={bookmarked} />}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {toast && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{toast}</p>}
      {lightboxOpen && mark.image_url && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="relative w-full max-w-3xl rounded-xl border border-white/20 bg-black p-2">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white"
              aria-label="Close image preview"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark.image_url} alt="" className="max-h-[85vh] w-full rounded-lg object-contain" />
          </div>
        </div>
      )}
    </article>
  );
}
