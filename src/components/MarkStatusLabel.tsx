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
}: {
  status: MarkStatus;
  withdrawnAt?: string | null;
}) {
  if (withdrawnAt) {
    return <span className="status-withdrawn">WITHDRAWN</span>;
  }
  if (status === 'ACTIVE') return null;
  const config = BADGE_CONFIG[status];
  if (!config) return null;
  return <span className={config.className}>{config.label}</span>;
}
