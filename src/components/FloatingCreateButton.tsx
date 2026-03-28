'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCreateMarkModal } from '@/context/CreateMarkModalContext';

const SCROLL_THRESHOLD = 8;

/** Core product surfaces only — not marketing/historical browse or admin. */
function shouldShowFloatingCreateButton(pathname: string): boolean {
  const p = pathname.split('?')[0] ?? '';
  if (p === '/' || p === '/feed') return true;
  if (p.startsWith('/mark/')) return true;
  if (p.startsWith('/profile/')) return true;
  return ['/notifications', '/bookmarks', '/search', '/settings', '/create'].includes(p);
}

export function FloatingCreateButton({
  isSignedIn,
  username,
}: {
  isSignedIn: boolean;
  username: string | null;
}) {
  const pathname = usePathname();
  const showFab = isSignedIn && shouldShowFloatingCreateButton(pathname);
  const { openCreateModal } = useCreateMarkModal();
  const [dimmed, setDimmed] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      ticking.current = false;
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y < 40) {
        setDimmed(false);
        return;
      }
      if (delta > SCROLL_THRESHOLD) setDimmed(true);
      else if (delta < -SCROLL_THRESHOLD) setDimmed(false);
    });
  }, []);

  useEffect(() => {
    if (!showFab) return;
    lastY.current = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showFab, onScroll]);

  if (!showFab) return null;

  return (
    <button
      type="button"
      onClick={openCreateModal}
      aria-label={username ? `Create mark (from @${username})` : 'Create mark'}
      className={`fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#facc15] text-2xl font-light leading-none text-neutral-900 shadow-lg transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] sm:bottom-6 ${
        dimmed ? 'opacity-40' : 'opacity-100'
      }`}
    >
      <span aria-hidden>+</span>
    </button>
  );
}
