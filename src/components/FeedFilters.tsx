'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';

interface FeedFiltersProps {
  currentDomain?: string;
  currentClaimType?: string;
  challengedOnly?: boolean;
}

export function FeedFilters({
  currentDomain = 'all',
  currentClaimType = 'all',
  challengedOnly = false,
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

  const setChallengedOnly = (v: boolean) => {
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
          className="min-h-[44px] touch-manipulation rounded-lg border border-gray-700 bg-[#0D1117] px-3 py-2 text-sm text-white focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
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
          className="min-h-[44px] touch-manipulation rounded-lg border border-gray-700 bg-[#0D1117] px-3 py-2 text-sm text-white focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
        >
          <option value="all">All claim types</option>
          {CLAIM_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={challengedOnly}
            onChange={(e) => setChallengedOnly(e.target.checked)}
            className="rounded border-gray-500 bg-[#0D1117] text-[#C9A84C]"
          />
          Challenged only
        </label>
    </div>
  );
}
