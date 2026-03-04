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
  challengedOnly: boolean;
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
  challengedOnly,
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-1">
        {(['marks', 'challenges', 'comments', 'supported'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
              currentTab === t
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {currentTab === 'marks' && (
        <>
          <ProfileMarksFilters username={username} currentDomain={domain} currentClaimType={claimType} challengedOnly={challengedOnly} />
          <ProfileMarksList
            username={username}
            initialMarks={marks}
            initialNextCursor={marksNextCursor}
            domain={domain}
            claimType={claimType}
            challengedOnly={challengedOnly}
            currentUserId={currentUserId}
          />
        </>
      )}
      {currentTab === 'supported' && (
        <ProfileSupportedList username={username} initialMarks={supportedMarks} initialNextCursor={supportedNextCursor} currentUserId={currentUserId} />
      )}
      {currentTab === 'challenges' && (
        <>
          <ul className="space-y-3">
            {challenges.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-muted/60 p-3 text-sm">
                <a href={`/mark/${c.mark_id}`} className="font-medium text-foreground hover:underline">
                  View mark
                </a>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{c.evidence_text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.outcome ?? 'PENDING'} · {new Date(c.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
          {challenges.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No challenges yet.</p>
          )}
        </>
      )}
      {currentTab === 'comments' && (
        <>
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-muted/60 p-3 text-sm">
                <a href={`/mark/${c.mark_id}`} className="font-medium text-foreground hover:underline">
                  View mark
                </a>
                <p className="mt-1 text-foreground">{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
          {comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>
          )}
        </>
      )}
    </div>
  );
}
