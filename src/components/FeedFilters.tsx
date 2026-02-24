'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';

interface FeedFiltersProps {
  currentDomain?: string;
  currentClaimType?: string;
  disputedOnly?: boolean;
}

export function FeedFilters({
  currentDomain = 'all',
  currentClaimType = 'all',
  disputedOnly = false,
}: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === 'all' || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.delete('cursor');
    router.push(`/?${next.toString()}`);
  };

  const setDisputedOnly = (v: boolean) => {
    const next = new URLSearchParams(searchParams.toString());
    if (v) next.set('disputed_only', 'true');
    else next.delete('disputed_only');
    next.delete('cursor');
    router.push(`/?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by domain"
          value={currentDomain}
          onChange={(e) => setParam('domain', e.target.value)}
          className="min-h-[44px] touch-manipulation rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Filter by claim type"
          value={currentClaimType}
          onChange={(e) => setParam('claim_type', e.target.value)}
          className="min-h-[44px] touch-manipulation rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">All claim types</option>
          {CLAIM_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={disputedOnly}
            onChange={(e) => setDisputedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Disputed only
        </label>
    </div>
  );
}
