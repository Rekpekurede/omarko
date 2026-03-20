/** Set to false to hide the secondary hero line (e.g. "Let people know.") */
const SHOW_HERO_SUBTEXT = true;

export function FeedIntroBanner() {
  return (
    <section className="hero-banner rounded-2xl border border-border bg-bg-card px-4 py-10 text-center sm:px-6 sm:py-12">
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            backgroundSize: '140%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          className="omarko-hero-mark"
          aria-label="OMarko"
        />
      </div>
      <p className="hero-title display-text mt-6 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        You&apos;re claiming it&apos;s yours
      </p>
      {SHOW_HERO_SUBTEXT && (
        <p className="hero-subtitle display-text mx-auto mt-4 max-w-xl text-base font-medium italic leading-relaxed text-accent">
          Let people know.
        </p>
      )}
    </section>
  );
}
