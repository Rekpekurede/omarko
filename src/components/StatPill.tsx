interface StatPillProps {
  label: string;
  value: number | string;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}
