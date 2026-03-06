'use client';

/** Skeleton placeholder for a mark card — fades in smoothly when used during loading. */
export function MarkCardSkeleton() {
  return (
    <article
      className="animate-fade-in rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
      style={{ marginBottom: 16 }}
    >
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--border-subtle)]" />
        <div className="h-4 w-24 rounded bg-[var(--border-subtle)]" />
        <div className="ml-auto h-3 w-16 rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-20 rounded bg-[var(--border-subtle)]" />
        <div className="h-5 w-16 rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-[var(--border-subtle)]" />
        <div className="h-4 w-[80%] rounded bg-[var(--border-subtle)]" />
      </div>
      <div className="my-4 border-t border-border-subtle" />
      <div className="flex gap-8">
        <div className="h-4 w-8 rounded bg-[var(--border-subtle)]" />
        <div className="h-4 w-8 rounded bg-[var(--border-subtle)]" />
        <div className="h-4 w-12 rounded bg-[var(--border-subtle)]" />
      </div>
    </article>
  );
}
