'use client';

import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Custom PWA install button: only visible when install is possible (beforeinstallprompt fired).
 * On click: triggers the deferred prompt, handles userChoice, then hides after the attempt.
 * Works on mobile and desktop Chrome. Placed in the side drawer (nav/settings area).
 */
export function PwaInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [pending, setPending] = useState(false);

  if (!isInstallable || isInstalled) return null;

  const handleClick = async () => {
    setPending(true);
    try {
      await promptInstall();
      // Button hides automatically: promptInstall() clears deferred prompt on accept/dismiss
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="tap-press flex w-full items-center gap-4 rounded-r-lg border-l-[3px] border-transparent py-4 px-6 text-left text-text-secondary transition-colors duration-150 hover:border-accent hover:text-text-primary disabled:opacity-60"
      aria-label="Install Omarko app"
    >
      <span className="text-xl" aria-hidden>📲</span>
      <span>{pending ? 'Opening…' : 'Install Omarko'}</span>
    </button>
  );
}
