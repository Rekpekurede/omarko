/** Set to false to hide the secondary hero line (e.g. "Let people know.") */
const SHOW_HERO_SUBTEXT = true;

/** Placeholder logo – replace with final asset when ready */
function PlaceholderLogo() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center" aria-hidden>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-14 w-14 text-foreground drop-shadow-sm"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="2.25"
          className="opacity-90"
        />
        <circle cx="24" cy="24" r="5" fill="currentColor" className="opacity-90" />
      </svg>
    </div>
  );
}

export function FeedIntroBanner() {
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-6 text-center shadow-sm sm:px-6">
      <PlaceholderLogo />
      <p className="mt-3 text-base font-semibold text-foreground sm:text-lg">You&apos;re claiming it&apos;s yours</p>
      {SHOW_HERO_SUBTEXT && (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground/80">
          Let people know.
        </p>
      )}
    </section>
  );
}
