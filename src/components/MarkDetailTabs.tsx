'use client';

/** Audit: removed dev-only console.log (comment posted). */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChallengeForm } from './ChallengeForm';
import { ChallengeEditEvidence } from './ChallengeEditEvidence';
import { VersionsTab } from './VersionsTab';

interface ChallengeRow {
  id: string;
  challenger_id: string;
  evidence_text: string;
  evidence_url?: string | null;
  claimed_original_date?: string | null;
  is_evidence_backed?: boolean;
  outcome?: string;
  resolved_at?: string | null;
  created_at: string;
  profiles?: { username: string; display_name?: string | null } | { username: string; display_name?: string | null }[] | null;
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { username: string; display_name?: string | null } | { username: string; display_name?: string | null }[] | null;
}

interface SoiRow {
  id: string;
  mark_id: string;
  url: string;
  created_at: string;
}

interface MarkDetailTabsProps {
  markId: string;
  currentTab: 'overview' | 'challenges' | 'comments' | 'versions' | 'soi';
  challenges: ChallengeRow[];
  comments: CommentRow[];
  canChallenge: boolean;
  challengeDisabledReason?: string;
  isWithdrawn: boolean;
  currentUserId: string | null;
  versionCount?: number;
  canEdit?: boolean;
  challengeCount?: number;
  soiCount?: number;
  isOwner?: boolean;
  canAddSoi?: boolean;
}

function getUsername(profiles: ChallengeRow['profiles']): string {
  if (!profiles) return 'unknown';
  return Array.isArray(profiles) ? profiles[0]?.username ?? 'unknown' : profiles.username;
}

function getDisplayPrimary(profiles: CommentRow['profiles']): string {
  if (!profiles) return '@unknown';
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  const username = p?.username ?? 'unknown';
  const displayName = (p as { display_name?: string | null })?.display_name?.trim();
  return displayName || `@${username}`;
}

function getShowSecondary(profiles: CommentRow['profiles']): boolean {
  if (!profiles) return false;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return !!((p as { display_name?: string | null })?.display_name?.trim());
}

export function MarkDetailTabs({
  markId,
  currentTab,
  challenges,
  comments,
  canChallenge,
  challengeDisabledReason,
  isWithdrawn,
  currentUserId,
  versionCount = 0,
  canEdit = false,
  challengeCount = 0,
  soiCount: initialSoiCount = 0,
  isOwner = false,
  canAddSoi: canAddSoiProp = false,
}: MarkDetailTabsProps) {
  const canAddSoi = canAddSoiProp || (isOwner && !isWithdrawn);
  void canEdit; // reserved for future edit UI
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'overview' | 'challenges' | 'comments' | 'versions' | 'soi'>(currentTab);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [soiList, setSoiList] = useState<SoiRow[]>([]);
  const [soiLoading, setSoiLoading] = useState(false);
  const [soiUrl, setSoiUrl] = useState('');
  const [soiSubmitting, setSoiSubmitting] = useState(false);
  const [soiError, setSoiError] = useState<string | null>(null);

  useEffect(() => {
    setTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (tab !== 'comments') return;
    if (searchParams.get('focus') !== '1') return;
    commentInputRef.current?.focus();
  }, [tab, searchParams]);

  useEffect(() => {
    if (tab !== 'soi') return;
    setSoiLoading(true);
    fetch(`/api/marks/${markId}/soi`)
      .then((res) => res.json())
      .then((data) => {
        setSoiList(Array.isArray(data.soi) ? data.soi : []);
      })
      .catch(() => setSoiList([]))
      .finally(() => setSoiLoading(false));
  }, [tab, markId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !currentUserId || commentSubmitting) return;
    setCommentError(null);
    setCommentSubmitting(true);
    const res = await fetch(`/api/marks/${markId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentContent.trim() }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCommentError(payload.error ?? 'Failed to post comment');
      setCommentSubmitting(false);
      return;
    }
    setCommentContent('');
    router.refresh();
    setCommentSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-1" aria-label="Mark sections">
        {(
          [
            { id: 'overview' as const, label: 'Overview' },
            { id: 'challenges' as const, label: `Challenges (${challengeCount})` },
            { id: 'soi' as const, label: `SOI (${tab === 'soi' ? soiList.length : initialSoiCount})` },
            { id: 'comments' as const, label: `Comments (${comments.length})` },
            ...(versionCount > 0 ? [{ id: 'versions' as const, label: `History (${versionCount})` }] : []),
          ] as const
        ).map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => setTab(id)}
              className={`px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-[#C9A84C] text-[var(--text-primary)]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <p className="text-sm italic text-muted-foreground">No activity yet.</p>}

      {tab === 'soi' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign of influence (SOI): links to posts or content that you say take credit from your work.
          </p>
          {canAddSoi && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const url = soiUrl.trim();
                if (!url || soiSubmitting) return;
                setSoiError(null);
                setSoiSubmitting(true);
                const res = await fetch(`/api/marks/${markId}/soi`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setSoiError(data.error ?? 'Failed to add SOI');
                  setSoiSubmitting(false);
                  return;
                }
                setSoiList((prev) => [...prev, data]);
                setSoiUrl('');
                router.refresh();
                setSoiSubmitting(false);
              }}
              className="space-y-2"
            >
              <input
                type="url"
                value={soiUrl}
                onChange={(e) => setSoiUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
              />
              {soiError && <p className="text-sm text-red-600">{soiError}</p>}
              <button
                type="submit"
                disabled={!soiUrl.trim() || soiSubmitting}
                className="min-h-[40px] rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {soiSubmitting ? 'Adding…' : 'Add SOI'}
              </button>
            </form>
          )}
          {soiLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {soiList.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-foreground hover:underline">
                    {s.url}
                  </a>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/marks/${markId}/soi/${s.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setSoiList((prev) => prev.filter((x) => x.id !== s.id));
                          router.refresh();
                        }
                      }}
                      className="shrink-0 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!soiLoading && soiList.length === 0 && (
            <p className="text-sm text-muted-foreground">No signs of influence yet.</p>
          )}
        </div>
      )}

      {tab === 'versions' && (
        <VersionsTab markId={markId} />
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {!isWithdrawn && currentUserId && (
            <ChallengeForm markId={markId} canChallenge={canChallenge} challengeDisabledReason={challengeDisabledReason} />
          )}
          <ul className="space-y-3">
            {challenges.map((c) => {
              const username = getUsername(c.profiles);
              const p = c.profiles && (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles) as { display_name?: string | null } | undefined;
              const dn = p?.display_name?.trim() ?? '';
              const challengerPrimary = dn ? dn : `@${username}`;
              const challengerShowSecondary = !!dn;
              const outcome = c.outcome ?? 'PENDING';
              const isResolved = outcome !== 'PENDING';
              const isChallenger = currentUserId === c.challenger_id;
              return (
                <li key={c.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[0.95rem] font-bold text-[var(--text-primary)]">{challengerPrimary}</span>
                    {challengerShowSecondary && <span className="text-[0.78rem] text-[var(--text-muted)]">@{username}</span>}
                    {c.is_evidence_backed ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Evidence-backed</span>
                    ) : (
                      <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">No evidence yet</span>
                    )}
                    {isResolved && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        outcome === 'WON' ? 'bg-green-200 text-green-900' :
                        outcome === 'LOST' ? 'bg-red-200 text-red-900' :
                        outcome === 'CONCEDED' ? 'bg-amber-200 text-amber-900' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {outcome}
                      </span>
                    )}
                  </div>
                  {c.claimed_original_date && (
                    <p className="mt-1 text-muted-foreground">Claimed original date: {c.claimed_original_date}</p>
                  )}
                  <p className="mt-1 text-foreground">{c.evidence_text}</p>
                  {c.evidence_url && (
                    <p className="mt-1">
                      <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground hover:underline">
                        Evidence link
                      </a>
                    </p>
                  )}
                  {isChallenger && outcome === 'PENDING' && (
                    <ChallengeEditEvidence challengeId={c.id} currentEvidenceUrl={c.evidence_url} currentClaimedDate={c.claimed_original_date} />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                </li>
              );
            })}
          </ul>
          {challenges.length === 0 && (
            <p className="text-sm text-muted-foreground">No challenges yet.</p>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="space-y-4">
          {currentUserId && (
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                ref={commentInputRef}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
              />
              {commentError && <p className="text-sm text-red-600">{commentError}</p>}
              <button
                type="submit"
                disabled={!commentContent.trim() || commentSubmitting}
                className="min-h-[40px] rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {commentSubmitting ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          )}
          <ul className="space-y-2">
            {comments.map((c) => {
              const username = getUsername(c.profiles);
              const displayPrimary = getDisplayPrimary(c.profiles);
              const showSecondary = getShowSecondary(c.profiles);
              return (
                <li key={c.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[0.95rem] font-bold text-[var(--text-primary)]">{displayPrimary}</span>
                      {showSecondary && <span className="ml-1.5 text-[0.78rem] text-[var(--text-muted)]">@{username}</span>}
                    </div>
                    <span className="text-[0.75rem] text-[var(--text-muted)] shrink-0">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 text-foreground">{c.content}</p>
                </li>
              );
            })}
          </ul>
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
