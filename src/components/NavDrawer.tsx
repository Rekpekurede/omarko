'use client';

import { useState } from 'react';
import { SideDrawer } from './SideDrawer';

interface NavDrawerProps {
  username: string | null;
  avatarUrl: string | null;
}

export function NavDrawer({ username, avatarUrl }: NavDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-transparent text-[#C9A84C] hover:bg-[#C9A84C]/10 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 dark:text-[#C9A84C] dark:hover:bg-[#C9A84C]/15"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <SideDrawer
        open={open}
        onClose={() => setOpen(false)}
        username={username}
        avatarUrl={avatarUrl}
      />
    </>
  );
}
