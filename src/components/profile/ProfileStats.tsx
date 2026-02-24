'use client';

interface StatItem {
  label: string;
  value: number;
}

interface ProfileStatsProps {
  totalMarks: number;
  champions: number;
  supplanted: number;
  disputesRaised: number;
  disputesWon: number;
  disputesLost: number;
  disputesConceded: number;
}

export function ProfileStats({
  totalMarks,
  champions,
  supplanted,
  disputesRaised,
  disputesWon,
  disputesLost,
  disputesConceded,
}: ProfileStatsProps) {
  const stats: StatItem[] = [
    { label: 'Marks', value: totalMarks },
    { label: 'Champions', value: champions },
    { label: 'Supplanted', value: supplanted },
    { label: 'Raised', value: disputesRaised },
    { label: 'Won', value: disputesWon },
    { label: 'Lost', value: disputesLost },
    { label: 'Conceded', value: disputesConceded },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <span className="block text-lg font-semibold text-black dark:text-white">{value}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
