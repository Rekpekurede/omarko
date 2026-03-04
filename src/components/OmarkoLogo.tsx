'use client';

interface OmarkoLogoProps {
  className?: string;
}

export function OmarkoLogo({ className }: OmarkoLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground" />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">OMARKO</span>
    </div>
  );
}
