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
          className="rounded-2xl border border-border bg-card p-3"
        >
          <span className="block text-lg font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
