import { OmarkoLogo } from './OmarkoLogo';

export function FeedIntroBanner() {
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-6 text-center shadow-sm sm:px-6">
      <OmarkoLogo className="justify-center" />
      <p className="mt-3 text-base font-semibold text-foreground sm:text-lg">Everyone here claims what they post is theirs.</p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground/80">
        Welcome to Omarko.
      </p>
    </section>
  );
}
