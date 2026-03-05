/** Set to false to hide the secondary hero line (e.g. "Let people know.") */
const SHOW_HERO_SUBTEXT = true;

/** OMarko origin mark: circle + inner dot, accent border and fill, subtle glow. */
function HeroCircle() {
  return (
    <div className="relative flex items-center justify-center" aria-hidden>
      <div className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        <div
          className="absolute inset-0 rounded-full border-2 border-accent"
          style={{ boxShadow: '0 0 20px var(--accent-glow)' }}
        />
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-11 w-11 text-accent sm:h-14 sm:w-14"
        >
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" className="opacity-90" />
          <circle cx="24" cy="24" r="5" fill="currentColor" className="opacity-90" />
        </svg>
      </div>
    </div>
  );
}

export function FeedIntroBanner() {
  return (
    <section className="rounded-2xl border border-border bg-bg-card px-4 py-10 text-center sm:px-6 sm:py-12">
      <HeroCircle />
      <p className="display-text mt-6 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        Is it yours?
      </p>
      {SHOW_HERO_SUBTEXT && (
        <p className="display-text mx-auto mt-4 max-w-xl text-base font-medium italic leading-relaxed text-accent">
          Let people know.
        </p>
      )}
    </section>
  );
}
