'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MarkStatusLabel } from './MarkStatusLabel';
import { BookmarkButton } from './BookmarkButton';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import type { Mark } from '@/lib/types';

/** Domain → filled pill background color (for feed card badges) */
const DOMAIN_PILL_CLASS: Record<string, string> = {
  Sport: 'bg-emerald-600 text-white',
  Technology: 'bg-cyan-600 text-white',
  Music: 'bg-amber-600 text-white',
  Science: 'bg-violet-600 text-white',
  Politics: 'bg-rose-600 text-white',
  Business: 'bg-sky-600 text-white',
  Law: 'bg-stone-600 text-white',
  Culture: 'bg-fuchsia-600 text-white',
  VisualArt: 'bg-orange-500 text-white',
  Literature: 'bg-amber-700 text-white',
  Dance: 'bg-pink-600 text-white',
  Architecture: 'bg-teal-600 text-white',
  Food: 'bg-amber-500 text-white',
  Philosophy: 'bg-indigo-600 text-white',
  General: 'bg-gray-600 text-white',
};

function getProfile(profiles: Mark['profiles']): { username: string; avatar_url?: string | null } | null {
  if (!profiles) return null;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return p ? { username: p.username, avatar_url: (p as { avatar_url?: string | null }).avatar_url } : null;
}

function getHistoricalName(historical: Mark['historical_profiles']): string | null {
  if (!historical) return null;
  const h = Array.isArray(historical) ? historical[0] : historical;
  return (h as { name?: string } | null)?.name ?? null;
}

interface MarkCardProps {
  mark: Mark;
  showDisputeButton?: boolean;
  /** @deprecated Use showDisputeButton */
  showChallengeButton?: boolean;
  bookmarked?: boolean;
  showBookmark?: boolean;
  currentVote?: 'SUPPORT' | 'OPPOSE' | null;
  canVote?: boolean;
  currentUserId?: string | null;
  onVoteUpdate?: (updatedMark: Partial<Mark>) => void;
  onVoteSuccess?: (markId: string, newVote: 'SUPPORT' | 'OPPOSE') => void;
  onDeleted?: (markId: string) => void;
}

export function MarkCard({
  mark,
  showDisputeButton: showDisputeButtonProp = true,
  showChallengeButton,
  bookmarked = false,
  showBookmark = false,
  currentVote = null,
  canVote = false,
  onVoteUpdate,
  onVoteSuccess,
}: MarkCardProps) {
  const showChallenge = showDisputeButtonProp ?? showChallengeButton ?? true;
  const profile = getProfile(mark.profiles);
  const historicalName = getHistoricalName(mark.historical_profiles);
  const isHistorical = !!mark.historical_profile_id && !!historicalName;
  const username = profile?.username ?? 'unknown';
  const avatarUrl = profile?.avatar_url ?? null;
  const isWithdrawn = !!mark.withdrawn_at;

  const [supportVotes, setSupportVotes] = useState(mark.support_votes ?? 0);
  const [opposeVotes, setOpposeVotes] = useState(mark.oppose_votes ?? 0);
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [pending, setPending] = useState(false);

  const handleVote = async (type: 'support' | 'oppose') => {
    if (!canVote || pending) return;
    setPending(true);
    const res = await fetch(`/api/marks/${mark.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) return;
    if (data) {
      setSupportVotes(data.support_votes ?? supportVotes);
      setOpposeVotes(data.oppose_votes ?? opposeVotes);
      setVote(data.userVote ?? null);
      onVoteUpdate?.(data);
      if (data.userVote) onVoteSuccess?.(mark.id, data.userVote);
    }
  };

  const commentsCount = mark.comments_count ?? 0;
  const soiCount = mark.soi_count ?? 0;
  const challengeCount = mark.dispute_count ?? 0;
  const domainPillClass = (mark.domain && DOMAIN_PILL_CLASS[mark.domain]) ? DOMAIN_PILL_CLASS[mark.domain] : 'bg-gray-600 text-white';

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isHistorical ? (
            <>
              <Link href={`/historical/profile/${mark.historical_profile_id}`} className="shrink-0">
                <Avatar username={historicalName} avatarUrl={null} size="sm" className="ring-2 ring-[#C9A84C]/60" />
              </Link>
              <Link href={`/historical/profile/${mark.historical_profile_id}`} className="font-bold text-foreground hover:underline">
                {historicalName}
              </Link>
              <span className="badge inline-flex items-center rounded-full border border-amber-500/70 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 dark:border-amber-500/70 dark:bg-amber-500/10 dark:text-amber-400">
                HISTORICAL FIGURE
              </span>
            </>
          ) : (
            <>
              <Link href={`/profile/${encodeURIComponent(username)}`} className="shrink-0">
                <Avatar username={username} avatarUrl={avatarUrl} size="sm" className="ring-2 ring-blue-500/60" />
              </Link>
              <Link href={`/profile/${encodeURIComponent(username)}`} className="font-bold text-foreground hover:underline">
                @{username}
              </Link>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RelativeTime dateString={mark.created_at} className="timestamp text-xs text-muted-foreground" />
          {mark.status !== 'ACTIVE' && <MarkStatusLabel status={mark.status} />}
          {isWithdrawn && (
            <span className="text-xs font-medium text-muted-foreground">Withdrawn</span>
          )}
          <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="More options">
            <span className="text-lg leading-none">⋯</span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {mark.claim_type && (
          <span className="badge inline-flex items-center rounded-full border border-[#C9A84C] bg-transparent px-2 py-0.5 text-xs font-bold uppercase text-[#C9A84C]">
            {mark.claim_type}
          </span>
        )}
        {mark.domain && (
          <span className={`badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase ${domainPillClass}`}>
            {mark.domain}
          </span>
        )}
      </div>

      {mark.content && (
        <p className="mt-3 text-base leading-snug text-foreground line-clamp-3">
          {mark.content}
        </p>
      )}
      {mark.image_url && (
        <Link href={`/mark/${mark.id}`} className="mt-2 block w-full">
          <div className="relative aspect-video max-h-64 w-full overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        </Link>
      )}

      <div className="my-3 border-t border-border" />

      <div className="engagement-count flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => handleVote('support')}
          disabled={!canVote || isWithdrawn || pending}
          className={`flex items-center gap-1.5 touch-manipulation disabled:opacity-50 ${
            vote === 'SUPPORT' ? 'text-[#C9A84C]' : 'hover:text-foreground'
          }`}
          aria-label="Support"
        >
          <span aria-hidden>👍</span>
          <span>{supportVotes}</span>
        </button>
        {showChallenge && !isWithdrawn && (
          isHistorical ? (
            <span className="flex items-center gap-1.5" title="Challenges on historical marks are reviewed by designated custodians.">
              <span aria-hidden>✖</span>
              <span>{challengeCount}</span>
              <span>Challenge</span>
            </span>
          ) : (
            <Link href={`/mark/${mark.id}`} className="flex items-center gap-1.5 hover:text-foreground">
              <span aria-hidden>✖</span>
              <span>{challengeCount}</span>
              <span>Challenge</span>
            </Link>
          )
        )}
        {!showChallenge && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden>✖</span>
            <span>{challengeCount}</span>
          </span>
        )}
        <Link href={`/mark/${mark.id}?tab=soi`} className="flex items-center gap-1.5 hover:text-foreground">
          <span aria-hidden>SOI</span>
          <span>{soiCount}</span>
        </Link>
        <button
          type="button"
          onClick={() => handleVote('oppose')}
          disabled={!canVote || isWithdrawn || pending}
          className={`flex items-center gap-1.5 touch-manipulation disabled:opacity-50 ${
            vote === 'OPPOSE' ? 'text-red-400' : 'hover:text-foreground'
          }`}
          aria-label="Oppose"
        >
          <span aria-hidden>👎</span>
          <span>{opposeVotes}</span>
        </button>
        <Link href={`/mark/${mark.id}?tab=comments`} className="flex items-center gap-1.5 hover:text-foreground">
          <span aria-hidden>💬</span>
          <span>{commentsCount}</span>
        </Link>
        {showBookmark && (
          <span className="inline-flex items-center gap-1.5" title={bookmarked ? 'Saved' : 'Save'}>
            <BookmarkButton markId={mark.id} bookmarked={bookmarked} />
          </span>
        )}
      </div>
    </article>
  );
}
