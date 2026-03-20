'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('cobrain');
    else if (theme === 'cobrain') setTheme('dark');
    else setTheme('dark'); // system → dark
  };

  const label =
    theme === 'cobrain' ? 'Cobrain' : theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors duration-150 hover:text-text-primary"
      title={`Theme: ${label} (click to cycle)`}
      aria-label={`Theme: ${label}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    </button>
  );
}
