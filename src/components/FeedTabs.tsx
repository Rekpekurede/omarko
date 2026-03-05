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
    <div className="mb-4 flex gap-0 rounded-xl border border-border p-1 bg-[var(--tab-container)]">
      <Link
        href={forYouHref}
        className={`font-mono min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-bold uppercase tracking-[0.1em] transition touch-manipulation ${
          tab === 'for_you'
            ? 'bg-[#C9A84C] text-[#1A1408]'
            : 'bg-transparent text-[#888888] hover:text-[var(--foreground)]'
        }`}
      >
        FOR YOU
      </Link>
      <Link
        href={followingHref}
        className={`font-mono min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-bold uppercase tracking-[0.1em] transition touch-manipulation ${
          tab === 'following'
            ? 'bg-[#C9A84C] text-[#1A1408]'
            : 'bg-transparent text-[#888888] hover:text-[var(--foreground)]'
        }`}
      >
        FOLLOWING
      </Link>
    </div>
  );
}
