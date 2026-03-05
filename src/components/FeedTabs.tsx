'use client';

import { useState } from 'react';

type FeedTab = 'marks' | 'evidence';

interface FeedTabsProps {
  children: React.ReactNode;
  followingContent?: React.ReactNode;
}

export function FeedTabs({ children, followingContent }: FeedTabsProps) {
  const [tab, setTab] = useState<FeedTab>('marks');

  return (
    <div className="space-y-4">
      <div className="flex rounded-sm border border-border bg-card p-1 dark:bg-muted/50">
        <button
          type="button"
          onClick={() => setTab('marks')}
          className={`tap-press flex-1 rounded-sm px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            tab === 'marks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          aria-pressed={tab === 'marks' ? 'true' : 'false'}
          aria-label="For you feed"
        >
          For you
        </button>
        <button
          type="button"
          onClick={() => setTab('evidence')}
          className={`tap-press flex-1 rounded-sm px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            tab === 'evidence' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          aria-pressed={tab === 'evidence' ? 'true' : 'false'}
          aria-label="Following feed"
        >
          Following
        </button>
      </div>

      {tab === 'marks' && children}
      {tab === 'evidence' && (followingContent ?? (
        <div className="rounded-sm border border-border bg-card p-8 text-center dark:bg-card-glass">
          <p className="font-display text-lg font-semibold text-foreground">Following</p>
          <p className="font-mono mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Sign in to see marks from people you follow.
          </p>
        </div>
      ))}
    </div>
  );
}
