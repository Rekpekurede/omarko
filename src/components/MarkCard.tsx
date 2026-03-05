'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarkStatusLabel } from './MarkStatusLabel';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import { Media } from './Media';
import { ClaimTypeBadge } from './ClaimTypeBadge';
import { SOIModal } from './SOIModal';
import type { Mark } from '@/lib/types';
import { DOMAINS } from '@/lib/types';

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
  onDeleted?: (markId: string) => void;
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
  onDeleted,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [classificationSaving, setClassificationSaving] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [claimTypeOptions, setClaimTypeOptions] = useState<string[]>([]);
  const [displayClaimType, setDisplayClaimType] = useState(getClaimTypeName(mark));
  const [displayDomain, setDisplayDomain] = useState(mark.domain ?? 'General');
  const [editingClaimType, setEditingClaimType] = useState(getClaimTypeName(mark));
  const [editingDomain, setEditingDomain] = useState(mark.domain ?? 'General');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [soiModalOpen, setSoiModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<'support' | 'oppose' | 'challenge' | 'comment' | null>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOwnMark = !!currentUserId && currentUserId === mark.user_id;
  const isChallengeActive = mark.status === 'CHALLENGED';

  useEffect(() => {
    if (!lightboxOpen && !soiModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setSoiModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen, soiModalOpen]);

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

  useEffect(() => {
    setDisplayClaimType(getClaimTypeName(mark));
    setDisplayDomain(mark.domain ?? 'General');
  }, [mark]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    const loadClaimTypes = async () => {
      const res = await fetch('/api/claim-types');
      const data = await res.json().catch(() => ({}));
      const fromApi = Array.isArray(data.results)
        ? data.results.map((row: { name?: string }) => row.name).filter((name: string | undefined): name is string => !!name)
        : [];
      const options = fromApi.length > 0 ? fromApi : [displayClaimType];
      if (!options.includes(displayClaimType)) {
        options.unshift(displayClaimType);
      }
      setClaimTypeOptions(Array.from(new Set(options)));
    };
    loadClaimTypes();
  }, [isEditModalOpen, displayClaimType]);

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

  const openClassificationModal = () => {
    setEditingClaimType(displayClaimType);
    setEditingDomain(displayDomain);
    setClassificationError(null);
    setIsEditModalOpen(true);
    setMenuOpen(false);
  };

  const [deletePending, setDeletePending] = useState(false);
  const handleDelete = async () => {
    if (deletePending) return;
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setMenuOpen(false);
    setDeletePending(true);
    const res = await fetch(`/api/marks/${mark.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setDeletePending(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete');
      return;
    }
    onDeleted?.(mark.id);
  };

  const saveClassification = async () => {
    if (!editingClaimType || !editingDomain || classificationSaving) return;
    setClassificationError(null);
    setClassificationSaving(true);

    const prevClaimType = displayClaimType;
    const prevDomain = displayDomain;
    setDisplayClaimType(editingClaimType);
    setDisplayDomain(editingDomain);

    const res = await fetch(`/api/marks/${mark.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_type: editingClaimType,
        domain: editingDomain,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDisplayClaimType(prevClaimType);
      setDisplayDomain(prevDomain);
      setClassificationError(data.error ?? 'Failed to update classification');
      setClassificationSaving(false);
      return;
    }

    setDisplayClaimType((data.claim_type as string | undefined) ?? editingClaimType);
    setDisplayDomain((data.domain as string | undefined) ?? editingDomain);
    setClassificationSaving(false);
    setIsEditModalOpen(false);
    setToast('Claim classification updated.');
    window.setTimeout(() => setToast(null), 2200);
  };

  const commentsCount = mark.comments_count ?? 0;
  const claimTypeName = displayClaimType;
  const firstMedia = mark.media?.[0] ?? null;
  const mediaKind = firstMedia?.kind ?? (mark.image_url ? 'image' : null);
  const rawMediaUrl = firstMedia?.signed_url ?? mark.image_url ?? null;
  const mediaUrl =
    rawMediaUrl && !rawMediaUrl.startsWith('http') && (mark.image_url === rawMediaUrl || !firstMedia?.signed_url)
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/mark-media/${rawMediaUrl.replace(/^\//, '')}`
      : rawMediaUrl;
  const mediaPoster = firstMedia?.poster_signed_url ?? null;

  return (
    <article className="card-document tap-press w-full rounded-sm border border-gray-200 p-5 shadow-sm transition-colors hover:border-foreground/20 dark:border-border dark:border-primary/10 dark:backdrop-blur-sm">
      <div className="flex gap-3">
        <div className="shrink-0 pt-0.5">
          <Avatar username={username} avatarUrl={avatarUrl} size="md" className="h-10 w-10 rounded-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2.5">
            <Link href={`/profile/${encodeURIComponent(username)}`} className="font-mono text-xs font-medium text-foreground hover:underline">
              @{username}
            </Link>
            <RelativeTime dateString={mark.created_at} className="ml-auto" />
            {mark.status !== 'ACTIVE' && (
              <MarkStatusLabel status={mark.status} />
            )}
            {isWithdrawn && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Withdrawn
              </span>
            )}
            {isOwnMark && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-label="Post options"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-9 z-20 min-w-[11rem] rounded-xl border border-border bg-card p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={openClassificationModal}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent/60"
                    >
                      Edit claim details
                    </button>
                    {isOwnMark && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push(`/mark/${mark.id}?tab=soi`);
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent/60"
                      >
                        Add SOI
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                      {deletePending ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <ClaimTypeBadge claimType={claimTypeName} domain={displayDomain} />
          {mediaKind === 'image' && mediaUrl && (
            <Media
              src={mediaUrl}
              alt=""
              width={firstMedia?.width ?? undefined}
              height={firstMedia?.height ?? undefined}
              interactive
              onClick={() => setLightboxOpen(true)}
            />
          )}
          {mark.content && (
            <p className="font-display mt-1 text-lg leading-relaxed text-foreground sm:text-xl">{mark.content}</p>
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
              className="block w-full overflow-hidden rounded-xl bg-black"
              aria-label="Open video preview"
            >
              <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
                {mediaPoster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPoster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-4xl text-muted-foreground">▶</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center text-4xl text-white/90 drop-shadow-lg">▶</div>
              </div>
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <div className="grid grid-cols-6 items-center gap-1 text-sm">
          <div className="relative min-w-0">
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
              className={`tap-press mx-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 ${
                vote === 'SUPPORT'
                  ? 'bg-primary/15 text-primary dark:bg-primary/20'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>👍</span>
              <span className="tabular-nums">{supportVotes}</span>
            </button>
          </div>

          <div className="relative min-w-0">
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
              className={`tap-press mx-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 disabled:opacity-50 ${
                isChallengeActive
                  ? 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>⚔</span>
              <span className="tabular-nums">{mark.dispute_count ?? 0}</span>
              <span className="hidden sm:inline">
                {(mark.dispute_count ?? 0) === 1 ? 'Challenge' : 'Challenges'}
              </span>
            </button>
          </div>

          <div className="relative min-w-0 flex justify-center">
            <button
              type="button"
              aria-label="Sign of influence"
              onClick={() => setSoiModalOpen(true)}
              className={`tap-press inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                (mark.soi_count ?? 0) > 0
                  ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/15'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span className="whitespace-nowrap">SOI</span>
              <span className="tabular-nums">{mark.soi_count ?? 0}</span>
            </button>
          </div>

          <div className="relative min-w-0">
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
              className={`tap-press mx-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:opacity-50 ${
                vote === 'OPPOSE'
                  ? 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>👎</span>
              <span className="tabular-nums">{opposeVotes}</span>
            </button>
          </div>

          <div className="relative min-w-0">
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
              className="tap-press mx-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              <span>💬</span>
              <span className="tabular-nums">{commentsCount}</span>
              <span className="hidden sm:inline">{commentsCount === 1 ? 'Comment' : 'Comments'}</span>
            </button>
          </div>

          <div className="relative min-w-0 flex justify-center">
            <button
              type="button"
              aria-label={saved ? 'Unsave' : 'Save'}
              onClick={handleToggleBookmark}
              disabled={!showBookmark || bookmarkPending}
              className={`tap-press mx-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 ${
                saved ? 'text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              <span>{saved ? '★' : '☆'}</span>
              <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
        {commentsCount > 0 && (
          <p className="mt-2 text-right text-xs text-muted-foreground">View all comments</p>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {toast && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{toast}</p>}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !classificationSaving) setIsEditModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">Edit Claim Classification</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor={`edit-claim-type-${mark.id}`}>
                  Claim Type
                </label>
                <select
                  id={`edit-claim-type-${mark.id}`}
                  value={editingClaimType}
                  onChange={(e) => setEditingClaimType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {claimTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground" htmlFor={`edit-domain-${mark.id}`}>
                  Domain
                </label>
                <select
                  id={`edit-domain-${mark.id}`}
                  value={editingDomain}
                  onChange={(e) => setEditingDomain(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {DOMAINS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {classificationError && <p className="mt-3 text-sm text-red-600">{classificationError}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={classificationSaving}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClassification}
                disabled={classificationSaving || !editingClaimType || !editingDomain}
                className="rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {classificationSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
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
              <img src={mediaUrl} alt="" className="max-h-[85vh] w-full rounded-lg object-contain" loading="lazy" />
            )}
          </div>
        </div>
      )}
      <SOIModal
        markId={mark.id}
        count={mark.soi_count ?? 0}
        open={soiModalOpen}
        onClose={() => setSoiModalOpen(false)}
      />
    </article>
  );
}
