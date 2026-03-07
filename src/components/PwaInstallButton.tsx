'use client';

import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Renders an "Install Omarko" nav item when the app is installable and not already installed.
 * Uses the deferred beforeinstallprompt so users can install after dismissing the browser banner.
 */
export function PwaInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [pending, setPending] = useState(false);

  if (!isInstallable || isInstalled) return null;

  const handleClick = async () => {
    setPending(true);
    try {
      await promptInstall();
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
    >
      <span className="text-xl" aria-hidden>📲</span>
      <span>{pending ? 'Opening…' : 'Install Omarko'}</span>
    </button>
  );
}
