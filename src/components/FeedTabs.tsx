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
    <div className="mb-6 flex gap-0 rounded-xl border border-[rgba(255,255,255,0.06)] bg-bg-secondary/80 p-1">
      <Link
        href={forYouHref}
        className={`tap-press font-body min-h-[44px] flex-1 rounded-lg px-4 py-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          tab === 'for_you'
            ? 'bg-gradient-to-br from-[#e8c66a] to-[#d4a93a] text-[#0a0a0a] shadow-md'
            : 'bg-transparent text-text-muted hover:text-text-secondary border border-transparent hover:border-[rgba(255,255,255,0.08)]'
        }`}
      >
        FOR YOU
      </Link>
      <Link
        href={followingHref}
        className={`tap-press font-body min-h-[44px] flex-1 rounded-lg px-4 py-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-200 ${
          tab === 'following'
            ? 'bg-gradient-to-br from-[#e8c66a] to-[#d4a93a] text-[#0a0a0a] shadow-md'
            : 'bg-transparent text-text-muted hover:text-text-secondary border border-transparent hover:border-[rgba(255,255,255,0.08)]'
        }`}
      >
        FOLLOWING
      </Link>
    </div>
  );
}
