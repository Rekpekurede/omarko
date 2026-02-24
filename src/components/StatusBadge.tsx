import type { MarkStatus } from '@/lib/types';

const statusStyles: Record<MarkStatus, string> = {
  ACTIVE: 'bg-gray-200 text-gray-800',
  CHALLENGED: 'bg-yellow-200 text-yellow-900',
  DISPUTED: 'bg-yellow-200 text-yellow-900',
  CHAMPION: 'bg-green-200 text-green-900',
  SUPPLANTED: 'bg-red-200 text-red-900',
};

export function StatusBadge({ status }: { status: MarkStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusStyles[status] ?? 'bg-gray-200 text-gray-800'}`}
    >
      {status}
    </span>
  );
}
