'use client';

/**
 * Domain/claim-type pill with per-domain and per-claim-type colors.
 * Technology=cyan, Music=amber, General=slate, Creation=violet, Innovation=emerald, etc.
 */
const DOMAIN_COLORS: Record<string, string> = {
  Technology: 'bg-cyan-500/15 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500/30',
  Music: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
  General: 'bg-slate-500/15 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-500/30',
  Dance: 'bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/30',
  Literature: 'bg-violet-500/15 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border-violet-500/30',
  VisualArt: 'bg-fuchsia-500/15 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 border-fuchsia-500/30',
  Architecture: 'bg-stone-500/15 text-stone-800 dark:bg-stone-500/20 dark:text-stone-300 border-stone-500/30',
  Politics: 'bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-500/30',
  Business: 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30',
  Science: 'bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/30',
  Sport: 'bg-green-500/15 text-green-800 dark:bg-green-500/20 dark:text-green-300 border-green-500/30',
  Law: 'bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-500/30',
  Culture: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
  Food: 'bg-orange-500/15 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-500/30',
  Philosophy: 'bg-purple-500/15 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-500/30',
};

const CLAIM_TYPE_COLORS: Record<string, string> = {
  Creation: 'bg-violet-500/15 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border-violet-500/30',
  Discovery: 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30',
  Prediction: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
  Plan: 'bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/30',
  Teaching: 'bg-teal-500/15 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border-teal-500/30',
  Conviction: 'bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/30',
  Strategy: 'bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-500/30',
};

const DEFAULT_PILL = 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-500/30';

function getDomainStyle(domain: string): string {
  return DOMAIN_COLORS[domain] ?? DEFAULT_PILL;
}

function getClaimTypeStyle(claimType: string): string {
  return CLAIM_TYPE_COLORS[claimType] ?? DEFAULT_PILL;
}

interface ClaimTypeBadgeProps {
  claimType: string;
  domain: string;
  className?: string;
}

export function ClaimTypeBadge({ claimType, domain, className = '' }: ClaimTypeBadgeProps) {
  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${getClaimTypeStyle(claimType)}`}
      >
        {claimType}
      </span>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${getDomainStyle(domain)}`}
      >
        {domain}
      </span>
    </div>
  );
}
