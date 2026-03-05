/** Set to false to hide the secondary hero line (e.g. "Let people know.") */
const SHOW_HERO_SUBTEXT = true;

/** OMarko logo mark: slow breathing pulse — gold (dark), deep amber (light). Idea coming to life. */
function HeroCircle() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden>
      <div className="absolute inset-0 animate-breathing-glow rounded-full bg-primary/25 blur-2xl dark:bg-primary/20" />
      <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        <div className="absolute inset-0 rounded-full border-2 border-primary/50 shadow-glow-sm dark:border-primary/40 dark:shadow-glow-sm" />
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-11 w-11 text-primary sm:h-14 sm:w-14"
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
    <section className="card-document rounded-sm border border-border px-4 py-10 text-center dark:border-primary/10 sm:px-6 sm:py-12">
      <HeroCircle />
      <p className="font-display mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Is it yours?
      </p>
      {SHOW_HERO_SUBTEXT && (
        <p className="font-display mx-auto mt-4 max-w-xl text-lg font-medium leading-relaxed text-primary">
          Let people know.
        </p>
      )}
    </section>
  );
}
