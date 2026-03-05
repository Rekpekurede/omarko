/** Set to false to hide the secondary hero line (e.g. "Let people know.") */
const SHOW_HERO_SUBTEXT = true;

/** Hero circle with pulsing glow — gold in dark mode, warm amber in light */
function HeroCircle() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden>
      <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/20 blur-xl dark:bg-primary/30" />
      <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <div className="absolute inset-0 rounded-full border-2 border-primary/40 shadow-glow-sm dark:border-primary/50 dark:shadow-glow-sm" />
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-primary drop-shadow-sm sm:h-12 sm:w-12"
        >
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.25" className="opacity-90" />
          <circle cx="24" cy="24" r="5" fill="currentColor" className="opacity-90" />
        </svg>
      </div>
    </div>
  );
}

export function FeedIntroBanner() {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/80 px-4 py-8 text-center shadow-card backdrop-blur-sm dark:border-primary/10 dark:bg-card-glass dark:shadow-glow-sm sm:px-6 sm:py-10">
      <HeroCircle />
      <p className="font-display mt-5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Is it yours?
      </p>
      {SHOW_HERO_SUBTEXT && (
        <p className="font-display mx-auto mt-3 max-w-xl text-base font-semibold leading-relaxed text-primary dark:text-primary">
          Let people know.
        </p>
      )}
    </section>
  );
}
