import type { MarkStatus } from '@/lib/types';

/** ACTIVE: no badge. CHALLENGED/WITHDRAWN/CONCEDED: use status-* classes. */
const BADGE_CONFIG: Record<Exclude<MarkStatus, 'ACTIVE'>, { label: string; className: string }> = {
  CHALLENGED: { label: 'CHALLENGED', className: 'status-challenged' },
  DISPUTED: { label: 'CHALLENGED', className: 'status-challenged' },
  WITHDRAWN: { label: 'WITHDRAWN', className: 'status-withdrawn' },
  CONCEDED: { label: 'CONCEDED', className: 'status-conceded' },
  CHAMPION: { label: 'CHAMPION', className: 'status-challenged' },
  SUPPLANTED: { label: 'SUPPLANTED', className: 'status-conceded' },
};

export function MarkStatusLabel({
  status,
  withdrawnAt,
  moderationStatus,
}: {
  status: MarkStatus;
  withdrawnAt?: string | null;
  moderationStatus?: string | null;
}) {
  if (moderationStatus === 'removed_not_a_mark') {
    return <span className="status-conceded">REMOVED</span>;
  }
  if (withdrawnAt) {
    return <span className="status-withdrawn">WITHDRAWN</span>;
  }
  if (status === 'ACTIVE') return null;
  const config = BADGE_CONFIG[status];
  if (!config) return null;
  return <span className={config.className}>{config.label}</span>;
}
