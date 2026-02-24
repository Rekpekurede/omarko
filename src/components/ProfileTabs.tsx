'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileMarksFilters } from './ProfileMarksFilters';
import { ProfileMarksList } from './ProfileMarksList';
import { ProfileSupportedList } from './ProfileSupportedList';
import type { Mark } from '@/lib/types';

type Tab = 'marks' | 'challenges' | 'comments' | 'supported';

interface ChallengeRow {
  id: string;
  mark_id: string;
  evidence_text: string;
  outcome?: string;
  created_at: string;
}

interface CommentRow {
  id: string;
  mark_id: string;
  content: string;
  created_at: string;
}

interface ProfileTabsProps {
  username: string;
  currentTab: Tab;
  marks: Mark[];
  marksNextCursor: string | null;
  domain: string;
  claimType: string;
  disputedOnly: boolean;
  supportedMarks: Mark[];
  supportedNextCursor: string | null;
  challenges: ChallengeRow[];
  comments: CommentRow[];
  currentUserId?: string | null;
}

export function ProfileTabs({
  username,
  currentTab,
  marks,
  marksNextCursor,
  domain,
  claimType,
  disputedOnly,
  supportedMarks,
  supportedNextCursor,
  challenges,
  comments,
  currentUserId = null,
}: ProfileTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', tab);
    router.push(`/profile/${encodeURIComponent(username)}?${next.toString()}`);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['marks', 'challenges', 'comments', 'supported'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              currentTab === t
                ? 'border-black text-black dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {currentTab === 'marks' && (
        <>
          <ProfileMarksFilters username={username} currentDomain={domain} currentClaimType={claimType} disputedOnly={disputedOnly} />
          <ProfileMarksList
            username={username}
            initialMarks={marks}
            initialNextCursor={marksNextCursor}
            domain={domain}
            claimType={claimType}
            disputedOnly={disputedOnly}
            currentUserId={currentUserId}
          />
        </>
      )}
      {currentTab === 'supported' && (
        <ProfileSupportedList username={username} initialMarks={supportedMarks} initialNextCursor={supportedNextCursor} currentUserId={currentUserId} />
      )}
      {currentTab === 'challenges' && (
        <ul className="space-y-3">
          {challenges.map((c) => (
            <li key={c.id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <a href={`/mark/${c.mark_id}`} className="font-medium text-black hover:underline dark:text-white">
                View mark
              </a>
              <p className="mt-1 text-gray-600 line-clamp-2 dark:text-gray-400">{c.evidence_text}</p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">{c.outcome ?? 'PENDING'} · {new Date(c.created_at).toLocaleString()}</p>
            </li>
          ))}
          {challenges.length === 0 && (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">No challenges yet.</p>
          )}
        </ul>
      )}
      {currentTab === 'comments' && (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded border border-gray-200 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <a href={`/mark/${c.mark_id}`} className="font-medium text-black hover:underline dark:text-white">
                View mark
              </a>
              <p className="mt-1 text-gray-600 dark:text-gray-400">{c.content}</p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleString()}</p>
            </li>
          ))}
          {comments.length === 0 && (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">No comments yet.</p>
          )}
        </ul>
      )}
    </div>
  );
}
