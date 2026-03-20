'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Tab = 'for_you' | 'following';

export function FeedTabs() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') === 'following' ? 'following' : 'for_you') as Tab;

  const pForYou = new URLSearchParams(searchParams.toString());
  pForYou.set('tab', 'for_you');
  const pFollowing = new URLSearchParams(searchParams.toString());
  pFollowing.set('tab', 'following');
  const forYouHref = `/?${pForYou.toString()}`;
  const followingHref = `/?${pFollowing.toString()}`;

  return (
    <div className="feed-tabs-container mb-5 flex gap-0 rounded-xl border border-[rgba(255,255,255,0.06)] bg-bg-secondary/80 p-1">
      <Link
        href={forYouHref}
        className={`feed-tab-link tap-press font-body min-h-[44px] flex-1 rounded-lg border border-transparent px-4 py-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          tab === 'for_you'
            ? 'feed-tab-active bg-[var(--accent)] text-[#0A0B0E] shadow-md'
            : 'bg-transparent text-[var(--accent-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-dim)]'
        }`}
      >
        FOR YOU
      </Link>
      <Link
        href={followingHref}
        className={`feed-tab-link tap-press font-body min-h-[44px] flex-1 rounded-lg border border-transparent px-4 py-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          tab === 'following'
            ? 'feed-tab-active bg-[var(--accent)] text-[#0A0B0E] shadow-md'
            : 'bg-transparent text-[var(--accent-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-dim)]'
        }`}
      >
        FOLLOWING
      </Link>
    </div>
  );
}
