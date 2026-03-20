'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarkStatusLabel } from './MarkStatusLabel';
import { BookmarkButton } from './BookmarkButton';
import { TooltipGuide } from './TooltipGuide';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import { ImageLightbox } from './ImageLightbox';
import type { Mark } from '@/lib/types';

/** Domain → precision label styling (bg, color, border) */
const DOMAIN_BADGE_CLASS: Record<string, string> = {
  Technology: 'bg-[rgba(6,182,212,0.12)] text-[#67E8F9] border border-[rgba(6,182,212,0.2)]',
  Music: 'bg-[rgba(251,146,60,0.12)] text-[#FCA86A] border border-[rgba(251,146,60,0.2)]',
  Science: 'bg-[rgba(52,211,153,0.12)] text-[#6EE7B7] border border-[rgba(52,211,153,0.2)]',
  Sport: 'bg-[rgba(74,222,128,0.12)] text-[#86EFAC] border border-[rgba(74,222,128,0.2)]',
  General: 'bg-[rgba(148,163,184,0.10)] text-[#94A3B8] border border-[rgba(148,163,184,0.15)]',
  Philosophy: 'bg-[rgba(167,139,250,0.12)] text-[#C4B5FD] border border-[rgba(167,139,250,0.2)]',
  'Visual Art': 'bg-[rgba(192,132,252,0.12)] text-[#D8B4FE] border border-[rgba(192,132,252,0.2)]',
  Religion: 'bg-[rgba(251,191,36,0.12)] text-[#FCD34D] border border-[rgba(251,191,36,0.2)]',
};
const DOMAIN_DEFAULT = 'bg-[rgba(148,163,184,0.10)] text-[#94A3B8] border border-[rgba(148,163,184,0.15)]';

function getProfile(profiles: Mark['profiles']): { username: string; avatar_url?: string | null; display_name?: string | null } | null {
  if (!profiles) return null;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return p ? { username: p.username, avatar_url: (p as { avatar_url?: string | null }).avatar_url, display_name: (p as { display_name?: string | null }).display_name } : null;
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
  currentUserId = null,
  onVoteUpdate,
  onVoteSuccess,
}: MarkCardProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const showChallenge = showDisputeButtonProp ?? showChallengeButton ?? true;
  const profile = getProfile(mark.profiles);
  const historicalName = getHistoricalName(mark.historical_profiles);
  const isHistorical = !!mark.historical_profile_id && !!historicalName;
  const username = profile?.username ?? 'unknown';
  const avatarUrl = profile?.avatar_url ?? null;
  const isWithdrawn = !!mark.withdrawn_at;
  const isOwner = !!currentUserId && currentUserId === mark.user_id;
  const challengeCount = mark.dispute_count ?? 0;
  const hasChallenges = challengeCount > 0;
  const ownerForChallenge = isHistorical ? historicalName : (profile?.username ?? null);
  const challengeTooltipText = ownerForChallenge
    ? `You don't believe this was @${ownerForChallenge}`
    : "You don't believe this claim belongs to this user";

  const [supportVotes, setSupportVotes] = useState(mark.support_votes ?? 0);
  const [opposeVotes, setOpposeVotes] = useState(mark.oppose_votes ?? 0);
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [pending, setPending] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [witnessGlow, setWitnessGlow] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setImageLoadError(false);
  }, [mark.id, mark.image_url]);
  const [lightboxUrl, setLightboxUrl] = useState('');

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

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
      if (data.userVote) {
        onVoteSuccess?.(mark.id, data.userVote);
        if (data.userVote === 'SUPPORT') {
          setWitnessGlow(true);
          setTimeout(() => setWitnessGlow(false), 1200);
        }
      }
    }
  };

  const commentsCount = mark.comments_count ?? 0;
  const soiCount = mark.soi_count ?? 0;
  const domainBadgeClass = (mark.domain && DOMAIN_BADGE_CLASS[mark.domain]) ? DOMAIN_BADGE_CLASS[mark.domain] : DOMAIN_DEFAULT;

  const displayNameTrimmed = profile?.display_name?.trim() ?? '';
  const displayPrimary = displayNameTrimmed ? displayNameTrimmed : `@${username}`;
  const showSecondaryUsername = !!displayNameTrimmed;

  const goToMark = () => router.push(`/mark/${mark.id}`);

  return (
    <article
      className={`mark-card relative z-0 cursor-pointer ${witnessGlow ? 'witness-glow' : ''}`}
      data-status={mark.status}
      onClick={goToMark}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToMark(); } }}
      aria-label={`View mark by ${isHistorical ? historicalName : `@${username}`}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {isHistorical ? (
            <>
              <Link href={`/historical/profile/${mark.historical_profile_id}`} className="shrink-0 cursor-pointer block transition-transform duration-200 ease-out hover:-translate-y-0.5" onClick={(e) => e.stopPropagation()}>
                <Avatar username={historicalName} avatarUrl={null} size="card" variant="certificate" className="mark-card-avatar" />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Link href={`/historical/profile/${mark.historical_profile_id}`} className="mark-card-display-name font-body text-[16px] font-semibold text-[var(--text-primary)] hover:underline cursor-pointer truncate" onClick={(e) => e.stopPropagation()}>
                      {historicalName}
                    </Link>
                    <span className="badge border border-[rgba(255,215,0,0.3)] text-accent bg-transparent shrink-0">
                      HISTORICAL FIGURE
                    </span>
                  </span>
                  <RelativeTime dateString={mark.created_at} className="font-body text-[12px] text-[var(--text-muted)] tabular-nums shrink-0" />
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href={`/profile/${encodeURIComponent(username)}`} className="shrink-0 cursor-pointer block transition-transform duration-200 ease-out hover:-translate-y-0.5" onClick={(e) => e.stopPropagation()}>
                <Avatar username={username} avatarUrl={avatarUrl} size="card" variant="certificate" className="mark-card-avatar" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/profile/${encodeURIComponent(username)}`} className="mark-card-display-name font-body text-[16px] font-semibold text-[var(--text-primary)] hover:underline cursor-pointer transition-colors duration-200 min-w-0 truncate" onClick={(e) => e.stopPropagation()}>
                    {displayPrimary}
                  </Link>
                  <RelativeTime dateString={mark.created_at} className="font-body text-[12px] text-[var(--text-muted)] tabular-nums shrink-0" />
                </div>
                {showSecondaryUsername && (
                  <Link href={`/profile/${encodeURIComponent(username)}`} className="font-body text-[13px] text-[var(--text-muted)] opacity-65 hover:underline cursor-pointer block mt-0.5" onClick={(e) => e.stopPropagation()}>
                    @{username}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4" onClick={(e) => e.stopPropagation()}>
          {(mark.status !== 'ACTIVE' || mark.withdrawn_at) && (
            <span className="ml-2 flex items-center">
              <MarkStatusLabel status={mark.status} withdrawnAt={mark.withdrawn_at} />
            </span>
          )}
          {isOwner && !isHistorical && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                className="cursor-pointer rounded p-1 text-text-muted transition-colors duration-150 hover:text-text-primary"
                aria-label="More options"
                aria-expanded={menuOpen ? 'true' : 'false'}
              >
                <span className="text-lg leading-none">⋯</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 min-w-[180px] rounded-lg border border-border bg-bg-card py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/mark/${mark.id}?edit=1`}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                    className="block cursor-pointer px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-card-hover"
                  >
                    Edit
                  </Link>
                  {!isWithdrawn && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          setMenuOpen(false);
                          const res = await fetch(`/api/marks/${mark.id}/withdraw`, { method: 'POST' });
                          if (res.ok) router.refresh();
                        }}
                        className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-card-hover"
                      >
                        Withdraw Claim
                      </button>
                      {hasChallenges && (
                        <button
                          type="button"
                          onClick={async () => {
                            setMenuOpen(false);
                            const res = await fetch(`/api/marks/${mark.id}/concede`, { method: 'POST' });
                            if (res.ok) router.refresh();
                          }}
                          className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-card-hover"
                        >
                          Concede to Challenge
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="badge-row mt-3">
        {mark.claim_type && (
          <span className="badge-claim-type">
            {mark.claim_type}
          </span>
        )}
        {mark.domain && (
          <span className={`badge-domain ${domainBadgeClass}`} data-domain={mark.domain}>
            {mark.domain}
          </span>
        )}
      </div>

      {(mark.image_url || mark.content) && (
        <>
          {mark.content && (
            <p className="mark-text mt-3 text-text-primary min-w-0 break-words">
              {mark.content}
            </p>
          )}
          {mark.image_url && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (imageLoadError) return;
                setLightboxUrl(mark.image_url ?? '');
                setLightboxOpen(true);
              }}
              className="mt-3 block w-full min-w-0 cursor-zoom-in group text-left"
            >
              <div className="relative w-fit max-w-full overflow-hidden rounded-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out group-hover:scale-[1.01]">
                {imageLoadError ? (
                  <div className="flex min-h-[120px] min-w-[200px] items-center justify-center rounded-[10px] bg-[var(--border-subtle)] py-12 text-[var(--text-muted)] font-body text-sm">
                    Image unavailable
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={mark.image_url}
                    alt=""
                    className="block max-w-full rounded-[10px] object-contain align-top"
                    style={{ maxHeight: 'min(70vh, 600px)' }}
                    loading="lazy"
                    onError={() => setImageLoadError(true)}
                  />
                )}
              </div>
            </button>
          )}
        </>
      )}

      <ImageLightbox
        imageUrl={lightboxUrl}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <div className="engagement-row mt-3 border-t border-border-subtle pt-3 flex flex-nowrap items-center justify-between gap-3 text-text-muted md:pt-3.5 md:gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-3 md:justify-between md:gap-4">
          <TooltipGuide
            tooltipKey="support"
            tooltipText="Support this Mark — you believe this claim is valid"
            requiresAuth
            currentUserId={currentUserId}
          >
            <button
              type="button"
              onClick={() => handleVote('support')}
              disabled={!canVote || isWithdrawn || pending}
              className={`tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                vote === 'SUPPORT' ? 'text-accent' : 'hover:text-accent'
              }`}
              aria-label="Support"
            >
              <span aria-hidden>👍</span>
              <span>{supportVotes}</span>
            </button>
          </TooltipGuide>
          {showChallenge && !isWithdrawn && (
            isHistorical ? (
              <TooltipGuide tooltipKey="challenge" tooltipText={challengeTooltipText}>
                <span className="engagement-challenge flex shrink-0 cursor-default items-center gap-1.5 whitespace-nowrap text-text-muted md:rounded-md md:border md:border-[var(--accent)] md:px-3 md:py-1 md:font-semibold md:text-[var(--accent)] md:transition-colors md:duration-150 md:hover:bg-[var(--accent-glow)]" title="Challenges on historical marks are reviewed by designated custodians.">
                  <span aria-hidden>⚔️ Challenge</span>
                  <span className="hidden md:inline" aria-hidden> · </span>
                  <span>{challengeCount}</span>
                </span>
              </TooltipGuide>
            ) : isOwner ? (
              <TooltipGuide tooltipKey="challenge" tooltipText={challengeTooltipText}>
                <Link href={`/mark/${mark.id}`} className="engagement-challenge tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-muted transition-colors duration-150 hover:text-accent md:rounded-md md:border md:border-[var(--accent)] md:px-3 md:py-1 md:font-semibold md:text-[var(--accent)] md:hover:bg-[var(--accent-glow)]">
                  <span aria-hidden>⚔️ Challenge</span>
                  <span className="hidden md:inline" aria-hidden> · </span>
                  <span>{challengeCount}</span>
                </Link>
              </TooltipGuide>
            ) : (
              <TooltipGuide tooltipKey="challenge" tooltipText={challengeTooltipText}>
                <Link href={`/mark/${mark.id}?tab=challenges`} className="engagement-challenge tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-muted transition-colors duration-150 hover:text-accent md:rounded-md md:border md:border-[var(--accent)] md:px-3 md:py-1 md:font-semibold md:text-[var(--accent)] md:hover:bg-[var(--accent-glow)]">
                  <span aria-hidden>⚔️ Challenge</span>
                  <span className="hidden md:inline" aria-hidden> · </span>
                  <span>{challengeCount}</span>
                </Link>
              </TooltipGuide>
            )
          )}
          {!showChallenge && (
            <span className="engagement-challenge flex shrink-0 items-center gap-1.5 whitespace-nowrap text-text-muted md:rounded-md md:border md:border-[var(--accent)] md:px-3 md:py-1 md:font-semibold md:text-[var(--accent)]">
              <span aria-hidden>⚔️ Challenge</span>
              <span className="hidden md:inline" aria-hidden> · </span>
              <span>{challengeCount}</span>
            </span>
          )}
          <TooltipGuide tooltipKey="soi" tooltipText="Sign of Influence — add evidence that this idea has spread">
            <Link href={`/mark/${mark.id}?tab=soi`} className="tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold tracking-wide transition-colors duration-150 hover:text-accent">
              <span aria-hidden>SOI</span>
              <span>{soiCount}</span>
            </Link>
          </TooltipGuide>
          <TooltipGuide
            tooltipKey="oppose"
            tooltipText="Oppose this Mark — you disagree with this claim"
            requiresAuth
            currentUserId={currentUserId}
          >
            <button
              type="button"
              onClick={() => handleVote('oppose')}
              disabled={!canVote || isWithdrawn || pending}
              className={`tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                vote === 'OPPOSE' ? 'text-red-400' : 'hover:text-accent'
              }`}
              aria-label="Oppose"
            >
              <span aria-hidden>👎</span>
              <span>{opposeVotes}</span>
            </button>
          </TooltipGuide>
          <TooltipGuide tooltipKey="comment" tooltipText="Comment on this Mark">
            <Link href={`/mark/${mark.id}?tab=comments`} className="tap-press flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors duration-150 hover:text-accent">
              <span aria-hidden>💬</span>
              <span>{commentsCount}</span>
            </Link>
          </TooltipGuide>
        </div>
        {showBookmark && (
          <TooltipGuide
            tooltipKey="bookmark"
            tooltipText="Save this Mark to your bookmarks"
            requiresAuth
            currentUserId={currentUserId}
          >
            <span className="engagement-bookmark ml-auto flex shrink-0 items-center" title={bookmarked ? 'Saved' : 'Save'}>
              <BookmarkButton markId={mark.id} bookmarked={bookmarked} iconOnly />
            </span>
          </TooltipGuide>
        )}
      </div>
    </article>
  );
}
