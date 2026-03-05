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
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-sm border border-border bg-card p-4 dark:bg-card-glass dark:backdrop-blur-sm"
        >
          <span className="font-mono block tabular-nums text-xl font-medium text-foreground">{value}</span>
          <span className="font-mono mt-0.5 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
