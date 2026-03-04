'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DOMAINS } from '@/lib/types';

interface FeedFiltersProps {
  currentDomain?: string;
  currentClaimType?: string;
  claimTypeOptions?: Array<{ id: string; name: string }>;
  challengedOnly?: boolean;
}

export function FeedFilters({
  currentDomain = 'all',
  currentClaimType = 'all',
  claimTypeOptions = [],
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
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <select
          aria-label="Filter by domain"
          value={currentDomain}
          onChange={(e) => setParam('domain', e.target.value)}
          className="min-h-[40px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
          className="min-h-[40px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="all">All claim types</option>
          {claimTypeOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={challengedOnly}
            onChange={(e) => setChallengedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Challenged only
        </label>
    </div>
  );
}
