'use client';

import { useState } from 'react';

type FeedTab = 'marks' | 'evidence';

interface FeedTabsProps {
  children: React.ReactNode;
}

export function FeedTabs({ children }: FeedTabsProps) {
  const [tab, setTab] = useState<FeedTab>('marks');

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setTab('marks')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
            tab === 'marks' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
          aria-pressed={tab === 'marks' ? 'true' : 'false'}
          aria-label="Marks feed"
        >
          Marks
        </button>
        <button
          type="button"
          onClick={() => setTab('evidence')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
            tab === 'evidence' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
          aria-pressed={tab === 'evidence' ? 'true' : 'false'}
          aria-label="Evidence of influence feed"
        >
          Evidence of influence
        </button>
      </div>

      {tab === 'marks' && children}
      {tab === 'evidence' && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-base font-medium text-foreground">Evidence of influence</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            See how claims connect and influence others. This view is coming soon.
          </p>
        </div>
      )}
    </div>
  );
}
