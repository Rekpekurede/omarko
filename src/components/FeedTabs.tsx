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
    <div className="mb-4 flex gap-0 rounded-xl bg-bg-secondary p-1">
      <Link
        href={forYouHref}
        className={`font-body min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-150 touch-manipulation ${
          tab === 'for_you'
            ? 'bg-accent text-bg-primary shadow-sm'
            : 'bg-transparent text-text-muted hover:text-text-secondary'
        }`}
      >
        FOR YOU
      </Link>
      <Link
        href={followingHref}
        className={`font-body min-h-[44px] flex-1 rounded-lg px-4 py-2.5 text-center text-[0.8rem] font-semibold uppercase tracking-[0.08em] transition-all duration-150 touch-manipulation ${
          tab === 'following'
            ? 'bg-accent text-bg-primary shadow-sm'
            : 'bg-transparent text-text-muted hover:text-text-secondary'
        }`}
      >
        FOLLOWING
      </Link>
    </div>
  );
}
