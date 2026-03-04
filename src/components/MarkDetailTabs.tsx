'use client';

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
  profiles?: { username: string } | { username: string }[] | null;
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { username: string } | { username: string }[] | null;
}

interface MarkDetailTabsProps {
  markId: string;
  currentTab: 'overview' | 'challenges' | 'comments' | 'versions';
  challenges: ChallengeRow[];
  comments: CommentRow[];
  canChallenge: boolean;
  isWithdrawn: boolean;
  currentUserId: string | null;
  versionCount?: number;
  canEdit?: boolean;
  challengeCount?: number;
}

function getUsername(profiles: ChallengeRow['profiles']): string {
  if (!profiles) return 'unknown';
  return Array.isArray(profiles) ? profiles[0]?.username ?? 'unknown' : profiles.username;
}

export function MarkDetailTabs({
  markId,
  currentTab,
  challenges,
  comments,
  canChallenge,
  isWithdrawn,
  currentUserId,
  versionCount = 0,
  canEdit = false,
  challengeCount = 0,
}: MarkDetailTabsProps) {
  void canEdit; // reserved for future edit UI
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'overview' | 'challenges' | 'comments' | 'versions'>(currentTab);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (tab !== 'comments') return;
    if (searchParams.get('focus') !== '1') return;
    commentInputRef.current?.focus();
  }, [tab, searchParams]);

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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MarkDetailTabs] comment posted', {
        markId,
        comments_count: payload.comments_count,
      });
    }
    setCommentContent('');
    router.refresh();
    setCommentSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === 'overview' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('challenges')}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === 'challenges' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          Challenges ({challengeCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === 'comments' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          Comments ({comments.length})
        </button>
        {versionCount > 0 && (
          <button
            type="button"
            onClick={() => setTab('versions')}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === 'versions' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
          >
            History ({versionCount})
          </button>
        )}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>This mark has {challengeCount} challenge{challengeCount !== 1 ? 's' : ''} and {comments.length} comment{comments.length !== 1 ? 's' : ''}.</p>
          <p>Use the tabs above to view details.</p>
        </div>
      )}

      {tab === 'versions' && (
        <VersionsTab markId={markId} />
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {!isWithdrawn && currentUserId && (
            <ChallengeForm markId={markId} canChallenge={canChallenge} />
          )}
          <ul className="space-y-3">
            {challenges.map((c) => {
              const challengerName = getUsername(c.profiles);
              const outcome = c.outcome ?? 'PENDING';
              const isResolved = outcome !== 'PENDING';
              const isChallenger = currentUserId === c.challenger_id;
              return (
                <li key={c.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">@{challengerName}</span>
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
              {commentError && <p className="text-sm text-red-600">{commentError}</p>}
              <button
                type="submit"
                disabled={!commentContent.trim() || commentSubmitting}
                className="min-h-[40px] rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {commentSubmitting ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          )}
          <ul className="space-y-2">
            {comments.map((c) => {
              const authorName = getUsername(c.profiles);
              return (
                <li key={c.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                  <span className="font-medium text-foreground">@{authorName}</span>
                  <span className="text-xs text-muted-foreground"> · {new Date(c.created_at).toLocaleString()}</span>
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
