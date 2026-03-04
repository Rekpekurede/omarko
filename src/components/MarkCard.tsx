'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarkStatusLabel } from './MarkStatusLabel';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
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

function getClaimTypeName(mark: Mark): string {
  const relation = mark.claim_types;
  const fromRelation = Array.isArray(relation) ? relation[0]?.name : relation?.name;
  return fromRelation || mark.claim_type || 'Unclassified';
}

function applyVoteTransition(
  prevVote: 'SUPPORT' | 'OPPOSE' | null,
  nextVote: 'SUPPORT' | 'OPPOSE'
): { vote: 'SUPPORT' | 'OPPOSE' | null; supportDelta: number; opposeDelta: number } {
  if (prevVote === nextVote) {
    return {
      vote: null,
      supportDelta: nextVote === 'SUPPORT' ? -1 : 0,
      opposeDelta: nextVote === 'OPPOSE' ? -1 : 0,
    };
  }
  if (prevVote === null) {
    return {
      vote: nextVote,
      supportDelta: nextVote === 'SUPPORT' ? 1 : 0,
      opposeDelta: nextVote === 'OPPOSE' ? 1 : 0,
    };
  }
  return {
    vote: nextVote,
    supportDelta: nextVote === 'SUPPORT' ? 1 : -1,
    opposeDelta: nextVote === 'OPPOSE' ? 1 : -1,
  };
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
  const router = useRouter();
  const profile = getProfile(mark.profiles);
  const username = profile?.username ?? 'unknown';
  const avatarUrl = profile?.avatar_url ?? null;
  const isWithdrawn = !!mark.withdrawn_at;

  const [supportVotes, setSupportVotes] = useState(mark.support_votes ?? 0);
  const [opposeVotes, setOpposeVotes] = useState(mark.oppose_votes ?? 0);
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [pending, setPending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [saved, setSaved] = useState(bookmarked);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<'support' | 'oppose' | 'challenge' | 'comment' | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const isOwnMark = !!currentUserId && currentUserId === mark.user_id;
  const isChallengeActive = mark.status === 'CHALLENGED';

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

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        window.clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setVote(currentVote);
    setSupportVotes(mark.support_votes ?? 0);
    setOpposeVotes(mark.oppose_votes ?? 0);
  }, [currentVote, mark.support_votes, mark.oppose_votes]);

  useEffect(() => {
    setSaved(bookmarked);
  }, [bookmarked]);

  const maybeShowFirstTimeTooltip = (type: 'support' | 'oppose' | 'challenge' | 'comment') => {
    if (typeof window === 'undefined') return;
    const key = `omarko.tooltip.seen.${type}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, '1');
    setActiveTooltip(type);
    if (tooltipTimerRef.current) window.clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = window.setTimeout(() => {
      setActiveTooltip(null);
    }, 2800);
  };

  const tooltipText: Record<'support' | 'oppose' | 'challenge' | 'comment', string> = {
    support: 'You like this claim or approve of it.',
    oppose: "You're not a fan of this claim.",
    challenge: 'You disagree that this person is the source of this claim.',
    comment: 'Join the discussion about this claim.',
  };

  const handleVote = async (nextVote: 'SUPPORT' | 'OPPOSE') => {
    if (!canVote || pending) return;
    if (isOwnMark && nextVote === 'OPPOSE') {
      setToast('You cannot oppose your own mark.');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setError(null);
    setPending(true);
    const previous = { vote, supportVotes, opposeVotes };
    const optimistic = applyVoteTransition(vote, nextVote);
    setVote(optimistic.vote);
    setSupportVotes((v) => Math.max(0, v + optimistic.supportDelta));
    setOpposeVotes((v) => Math.max(0, v + optimistic.opposeDelta));

    const res = await fetch(`/api/marks/${mark.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType: nextVote }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setVote(previous.vote);
      setSupportVotes(previous.supportVotes);
      setOpposeVotes(previous.opposeVotes);
      setError(data.error ?? 'Vote failed');
      if (res.status === 400 && typeof data.error === 'string' && data.error.toLowerCase().includes('cannot oppose your own')) {
        setToast(data.error);
        setTimeout(() => setToast(null), 2200);
      }
      setPending(false);
      return;
    }
    if (data) {
      setSupportVotes(data.support_votes ?? previous.supportVotes);
      setOpposeVotes(data.oppose_votes ?? previous.opposeVotes);
      setVote(data.userVote ?? null);
      onVoteUpdate?.(data);
      onVoteSuccess?.(mark.id, data.userVote ?? null);
    }
    setPending(false);
  };

  const handleToggleBookmark = async () => {
    if (!showBookmark || bookmarkPending) return;
    const previous = saved;
    setBookmarkPending(true);
    setSaved(!previous);
    const method = previous ? 'DELETE' : 'POST';
    const res = await fetch(`/api/marks/${mark.id}/bookmark`, { method });
    if (!res.ok) {
      setSaved(previous);
      setError('Failed to update save status');
    }
    setBookmarkPending(false);
  };

  const commentsCount = mark.comments_count ?? 0;
  const commentsLabel = commentsCount === 1 ? 'comment' : 'comments';
  const claimTypeName = getClaimTypeName(mark);
  const firstMedia = mark.media?.[0] ?? null;
  const mediaKind = firstMedia?.kind ?? (mark.image_url ? 'image' : null);
  const mediaUrl = firstMedia?.signed_url ?? mark.image_url ?? null;
  const mediaPoster = firstMedia?.poster_signed_url ?? null;

  return (
    <article className="w-full rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-foreground/20">
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <Avatar username={username} avatarUrl={avatarUrl} size="md" className="h-10 w-10 rounded-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2.5">
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
          <div className="rounded-md border border-border bg-muted/50 px-2.5 py-2">
            <p className="text-xs font-medium text-foreground">
              Claim: {claimTypeName} · {mark.domain}
            </p>
          </div>
          {mark.content && (
            <p className="text-base leading-relaxed text-foreground">{mark.content}</p>
          )}
          {mediaKind === 'image' && mediaUrl && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full text-left"
              aria-label="Open media preview"
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          )}
          {mediaKind === 'audio' && mediaUrl && (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <audio controls preload="metadata" className="w-full">
                <source src={mediaUrl} />
              </audio>
            </div>
          )}
          {mediaKind === 'video' && mediaUrl && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full text-left"
              aria-label="Open video preview"
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-border bg-muted sm:h-[420px]">
                {mediaPoster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPoster} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">▶</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/90">▶</div>
              </div>
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="grid grid-cols-5 items-center gap-1 text-sm">
          <div className="relative">
            {activeTooltip === 'support' && (
              <button
                type="button"
                onClick={() => setActiveTooltip(null)}
                className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground shadow"
              >
                {tooltipText.support}
              </button>
            )}
            <button
              type="button"
              aria-label="Support"
              onClick={() => {
                maybeShowFirstTimeTooltip('support');
                handleVote('SUPPORT');
              }}
              disabled={!canVote || isWithdrawn || pending}
              className={`mx-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 active:scale-95 ${
                vote === 'SUPPORT' ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>👍</span>
              <span>{supportVotes}</span>
            </button>
          </div>

          <div className="relative">
            {activeTooltip === 'oppose' && (
              <button
                type="button"
                onClick={() => setActiveTooltip(null)}
                className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground shadow"
              >
                {tooltipText.oppose}
              </button>
            )}
            <button
              type="button"
              aria-label="Oppose"
              onClick={() => {
                maybeShowFirstTimeTooltip('oppose');
                handleVote('OPPOSE');
              }}
              disabled={!canVote || isWithdrawn || pending || isOwnMark}
              className={`mx-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 active:scale-95 ${
                vote === 'OPPOSE' ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>👎</span>
              <span>{opposeVotes}</span>
            </button>
          </div>

          <div className="relative">
            {activeTooltip === 'challenge' && (
              <button
                type="button"
                onClick={() => setActiveTooltip(null)}
                className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground shadow"
              >
                {tooltipText.challenge}
              </button>
            )}
            <button
              type="button"
              aria-label="Challenge"
              onClick={() => {
                maybeShowFirstTimeTooltip('challenge');
                router.push(`/mark/${mark.id}?tab=challenges`);
              }}
              disabled={isWithdrawn || !showChallengeButton}
              className={`mx-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 active:scale-95 ${
                isChallengeActive ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>⚔</span>
              <span>{mark.dispute_count ?? 0}</span>
              <span className="hidden sm:inline">
                {(mark.dispute_count ?? 0) === 1 ? 'Challenge' : 'Challenges'}
              </span>
            </button>
          </div>

          <div className="relative">
            {activeTooltip === 'comment' && (
              <button
                type="button"
                onClick={() => setActiveTooltip(null)}
                className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground shadow"
              >
                {tooltipText.comment}
              </button>
            )}
            <button
              type="button"
              aria-label="Comments"
              onClick={() => {
                maybeShowFirstTimeTooltip('comment');
                router.push(`/mark/${mark.id}?tab=comments&focus=1`);
              }}
              className="mx-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 py-1 text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 active:scale-95"
            >
              <span>💬</span>
              <span>{commentsCount}</span>
              <span className="hidden sm:inline">{commentsCount === 1 ? 'Comment' : 'Comments'}</span>
            </button>
          </div>

          <button
            type="button"
            aria-label={saved ? 'Unsave' : 'Save'}
            onClick={handleToggleBookmark}
            disabled={!showBookmark || bookmarkPending}
            className={`mx-auto inline-flex min-h-[36px] items-center gap-1 rounded-full px-2 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 active:scale-95 ${
              saved ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            <span>{saved ? '★' : '☆'}</span>
            <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground">View all {commentsLabel}</p>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {toast && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{toast}</p>}
      {lightboxOpen && mediaUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="relative w-full max-w-3xl rounded-xl border border-white/20 bg-black p-2 animate-scale-in">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-sm text-white"
              aria-label="Close image preview"
            >
              ×
            </button>
            {mediaKind === 'video' ? (
              <video controls autoPlay preload="metadata" poster={mediaPoster ?? undefined} className="max-h-[85vh] w-full rounded-lg">
                <source src={mediaUrl} />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="" className="max-h-[85vh] w-full rounded-lg object-contain" />
            )}
          </div>
        </div>
      )}
    </article>
  );
}
