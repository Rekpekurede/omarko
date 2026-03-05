/** Placeholder logo – replace with final asset when ready */
function PlaceholderLogo() {
  return (
    <div
      className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 border-foreground/80 bg-muted/50"
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-foreground" />
    </div>
  );
}

export function FeedIntroBanner() {
  return (
    <section className="rounded-xl border border-border bg-card px-4 py-6 text-center shadow-sm sm:px-6">
      <PlaceholderLogo />
      <p className="mt-3 text-base font-semibold text-foreground sm:text-lg">Is it yours?</p>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground/80">
        Let people know.
      </p>
    </section>
  );
}
