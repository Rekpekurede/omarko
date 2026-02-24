'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
  const [tab, setTab] = useState<'overview' | 'challenges' | 'comments' | 'versions'>(currentTab);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCommentError(data.error ?? 'Failed to post comment');
      setCommentSubmitting(false);
      return;
    }
    setCommentContent('');
    router.refresh();
    setCommentSubmitting(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === 'overview' ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('challenges')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === 'challenges' ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
        >
          Challenges ({challengeCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === 'comments' ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
        >
          Comments ({comments.length})
        </button>
        {versionCount > 0 && (
          <button
            type="button"
            onClick={() => setTab('versions')}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === 'versions' ? 'border-black text-black dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}
          >
            History ({versionCount})
          </button>
        )}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3 text-sm text-gray-600">
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
                <li key={c.id} className="border-l-2 border-gray-200 pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-800">@{challengerName}</span>
                    {c.is_evidence_backed ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">Evidence-backed</span>
                    ) : (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-600">No evidence yet</span>
                    )}
                    {isResolved && (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
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
                    <p className="mt-1 text-gray-600">Claimed original date: {c.claimed_original_date}</p>
                  )}
                  <p className="mt-1 text-gray-800">{c.evidence_text}</p>
                  {c.evidence_url && (
                    <p className="mt-1">
                      <a href={c.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Evidence link
                      </a>
                    </p>
                  )}
                  {isChallenger && outcome === 'PENDING' && (
                    <ChallengeEditEvidence challengeId={c.id} currentEvidenceUrl={c.evidence_url} currentClaimedDate={c.claimed_original_date} />
                  )}
                  <p className="mt-1 text-gray-400">{new Date(c.created_at).toLocaleString()}</p>
                </li>
              );
            })}
          </ul>
          {challenges.length === 0 && (
            <p className="text-sm text-gray-500">No challenges yet.</p>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="space-y-4">
          {currentUserId && (
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              {commentError && <p className="text-sm text-red-600">{commentError}</p>}
              <button
                type="submit"
                disabled={!commentContent.trim() || commentSubmitting}
                className="rounded border border-black bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {commentSubmitting ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          )}
          <ul className="space-y-2">
            {comments.map((c) => {
              const authorName = getUsername(c.profiles);
              return (
                <li key={c.id} className="border-l-2 border-gray-100 pl-2 text-sm">
                  <span className="font-medium text-gray-700">@{authorName}</span>
                  <span className="text-gray-400"> · {new Date(c.created_at).toLocaleString()}</span>
                  <p className="mt-0.5 text-gray-800">{c.content}</p>
                </li>
              );
            })}
          </ul>
          {comments.length === 0 && (
            <p className="text-sm text-gray-500">No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
