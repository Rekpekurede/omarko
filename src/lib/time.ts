/**
 * Formats a mark timestamp for display.
 * - < 60 min → Xm (e.g. 12m)
 * - < 24 h → Xh (e.g. 5h)
 * - ≥ 24 h → Mon DD format (e.g. Feb 23)
 * No "ago" suffix.
 */
export function formatMarkTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
