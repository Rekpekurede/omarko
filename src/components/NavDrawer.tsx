'use client';

import { useDrawer } from '@/context/DrawerContext';

export function NavDrawer() {
  const { setOpen } = useDrawer();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
