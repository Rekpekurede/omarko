'use client';

import { formatMarkTime } from '@/lib/time';

interface RelativeTimeProps {
  dateString: string;
  className?: string;
}

/**
 * Client component that renders a relative timestamp.
 * Uses suppressHydrationWarning to avoid mismatch when server/client "now" differs slightly.
 */
export function RelativeTime({ dateString, className }: RelativeTimeProps) {
  return (
    <span className={className} suppressHydrationWarning>
      {formatMarkTime(dateString)}
    </span>
  );
}
