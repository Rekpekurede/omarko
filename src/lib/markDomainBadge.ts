/** Domain → badge utility classes (shared by mark detail; feed cards use the same map in MarkCard). */
export const DOMAIN_BADGE_CLASS: Record<string, string> = {
  Technology: 'bg-[rgba(6,182,212,0.12)] text-[#67E8F9] border border-[rgba(6,182,212,0.2)]',
  Music: 'bg-[rgba(251,146,60,0.12)] text-[#FCA86A] border border-[rgba(251,146,60,0.2)]',
  Science: 'bg-[rgba(52,211,153,0.12)] text-[#6EE7B7] border border-[rgba(52,211,153,0.2)]',
  Sport: 'bg-[rgba(74,222,128,0.12)] text-[#86EFAC] border border-[rgba(74,222,128,0.2)]',
  General: 'bg-[rgba(148,163,184,0.10)] text-[#94A3B8] border border-[rgba(148,163,184,0.15)]',
  Philosophy: 'bg-[rgba(167,139,250,0.12)] text-[#C4B5FD] border border-[rgba(167,139,250,0.2)]',
  'Visual Art': 'bg-[rgba(192,132,252,0.12)] text-[#D8B4FE] border border-[rgba(192,132,252,0.2)]',
  Religion: 'bg-[rgba(251,191,36,0.12)] text-[#FCD34D] border border-[rgba(251,191,36,0.2)]',
};
export const DOMAIN_DEFAULT =
  'bg-[rgba(148,163,184,0.10)] text-[#94A3B8] border border-[rgba(148,163,184,0.15)]';
