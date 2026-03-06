import type { MarkStatus } from '@/lib/types';

/** Only show badge for non-default states. ACTIVE gets no label. Uses globals.css vars only. */
const BADGE_CONFIG: Record<Exclude<MarkStatus, 'ACTIVE'>, { label: string; className: string }> = {
  CHALLENGED: { label: 'CHALLENGED', className: 'border border-accent-dim bg-transparent text-accent' },
  DISPUTED: { label: 'CHALLENGED', className: 'border border-accent-dim bg-transparent text-accent' },
  WITHDRAWN: { label: 'WITHDRAWN', className: 'border border-border bg-bg-card-hover text-text-secondary' },
  CONCEDED: { label: 'CONCEDED', className: 'border border-border bg-transparent text-text-muted' },
  CHAMPION: { label: 'CHAMPION', className: 'border border-accent-dim bg-transparent text-accent' },
  SUPPLANTED: { label: 'SUPPLANTED', className: 'border border-border bg-transparent text-text-muted' },
};

export function MarkStatusLabel({
  status,
  withdrawnAt,
}: {
  status: MarkStatus;
  withdrawnAt?: string | null;
}) {
  if (withdrawnAt) {
    return (
      <span className={`badge ${BADGE_CONFIG.WITHDRAWN.className}`}>
        {BADGE_CONFIG.WITHDRAWN.label}
      </span>
    );
  }
  if (status === 'ACTIVE') return null;
  const config = BADGE_CONFIG[status];
  if (!config) return null;
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
