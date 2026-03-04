import type { ReactNode } from 'react';

interface ActionButtonGroupProps {
  children: ReactNode;
}

export function ActionButtonGroup({ children }: ActionButtonGroupProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
