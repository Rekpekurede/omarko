import type { MarkStatus } from '@/lib/types';

const statusLabels: Record<MarkStatus, string> = {
  ACTIVE: '',
  CHALLENGED: 'Under challenge',
  DISPUTED: 'Under challenge',
  CHAMPION: 'Champion',
  SUPPLANTED: 'Supplanted',
};

export function MarkStatusLabel({ status }: { status: MarkStatus }) {
  const label = statusLabels[status];
  if (!label) return null;

  return (
    <span className="text-xs text-muted-foreground">
      {label}
    </span>
  );
}
