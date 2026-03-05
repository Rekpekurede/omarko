'use client';

/**
 * Archival classification stamps — small caps, monospaced, slightly outlined.
 * Per-domain colours: Technology=cyan, Music=amber, Philosophy=violet, Science=emerald, Fashion=rose, General=slate.
 */
const DOMAIN_COLORS: Record<string, string> = {
  Technology: 'bg-cyan-500/10 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-600/40 dark:border-cyan-400/30',
  Music: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-600/40 dark:border-amber-400/30',
  Philosophy: 'bg-violet-500/10 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-600/40 dark:border-violet-400/30',
  Science: 'bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-600/40 dark:border-emerald-400/30',
  General: 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border border-slate-500/40 dark:border-slate-400/30',
  Fashion: 'bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-600/40 dark:border-rose-400/30',
  Dance: 'bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-600/40 dark:border-rose-400/30',
  Literature: 'bg-violet-500/10 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-600/40 dark:border-violet-400/30',
  VisualArt: 'bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-600/40 dark:border-rose-400/30',
  Architecture: 'bg-stone-500/10 text-stone-700 dark:bg-stone-500/15 dark:text-stone-300 border border-stone-500/40 dark:border-stone-400/30',
  Politics: 'bg-red-500/10 text-red-800 dark:bg-red-500/15 dark:text-red-300 border border-red-600/40 dark:border-red-400/30',
  Business: 'bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-600/40 dark:border-emerald-400/30',
  Sport: 'bg-green-500/10 text-green-800 dark:bg-green-500/15 dark:text-green-300 border border-green-600/40 dark:border-green-400/30',
  Law: 'bg-indigo-500/10 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-600/40 dark:border-indigo-400/30',
  Culture: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-600/40 dark:border-amber-400/30',
  Food: 'bg-orange-500/10 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 border border-orange-600/40 dark:border-orange-400/30',
};

const CLAIM_TYPE_COLORS: Record<string, string> = {
  Creation: 'bg-violet-500/10 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-600/40 dark:border-violet-400/30',
  Discovery: 'bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-600/40 dark:border-emerald-400/30',
  Prediction: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-600/40 dark:border-amber-400/30',
  Plan: 'bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-600/40 dark:border-sky-400/30',
  Teaching: 'bg-teal-500/10 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300 border border-teal-600/40 dark:border-teal-400/30',
  Conviction: 'bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-600/40 dark:border-rose-400/30',
  Strategy: 'bg-indigo-500/10 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-600/40 dark:border-indigo-400/30',
};

const DEFAULT_STAMP = 'bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border border-slate-500/40 dark:border-slate-400/30';

function getDomainStyle(domain: string): string {
  return DOMAIN_COLORS[domain] ?? DEFAULT_STAMP;
}

function getClaimTypeStyle(claimType: string): string {
  return CLAIM_TYPE_COLORS[claimType] ?? DEFAULT_STAMP;
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
        className={`font-mono inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest ${getClaimTypeStyle(claimType)}`}
      >
        {claimType}
      </span>
      <span
        className={`font-mono inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-widest ${getDomainStyle(domain)}`}
      >
        {domain}
      </span>
    </div>
  );
}
