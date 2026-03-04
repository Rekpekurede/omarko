import type { ReactNode } from 'react';

interface ActionButtonGroupProps {
  children: ReactNode;
}

export function ActionButtonGroup({ children }: ActionButtonGroupProps) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}
