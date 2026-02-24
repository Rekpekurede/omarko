/**
 * Formats a timestamp for display.
 * - < 60 min → Xm (e.g. 12m)
 * - < 24 h → Xh (e.g. 5h)
 * - ≥ 24 h → month + date (e.g. Feb 23)
 * No "ago" suffix.
 */
export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
