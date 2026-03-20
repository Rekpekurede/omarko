import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForms } from '@/components/AuthForms';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function AuthPage({ searchParams }: PageProps) {
  const { message, error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Minimal header: wordmark only */}
      <header className="px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="OMarko home"
        >
          <div
            className="omarko-logo-mark h-[34px] w-[34px] rounded-[6px] shrink-0"
            aria-hidden
          />
          <span
            className="font-display text-[1.55rem] font-semibold leading-[1] text-[var(--accent)]"
          >
            OMarko
          </span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-12">
        <div className="space-y-6 md:space-y-12">
          <section>
            <h1 className="font-display text-[2.25rem] font-semibold leading-tight text-[var(--text-primary)] md:text-[3rem]">
              Everything comes from someone.
            </h1>
            <p className="mt-4 font-body text-[1rem] leading-relaxed text-[var(--text-secondary)] md:text-[1.05rem]">
              Omarko is where people record ideas, creations, predictions, and discoveries that
              began with them — so the world can later verify who started it.
            </p>
          </section>

          <section>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7">
                <p className="font-body text-[1rem] font-semibold text-[var(--text-primary)]">
                  Post a Mark
                </p>
                <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                  Record something that came from you — an idea, prediction, creation, argument, or
                  discovery. Timestamped. Public. Permanent.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7">
                <p className="font-body text-[1rem] font-semibold text-[var(--text-primary)]">
                  Attach Proof
                </p>
                <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                  Submit real-world evidence your idea spread — links, screenshots, citations. Your
                  influence becomes traceable.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-7">
                <p className="font-body text-[1rem] font-semibold text-[var(--text-primary)]">
                  Let the World Verify
                </p>
                <p className="mt-2 font-body text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
                  Anyone can challenge a claim with evidence. The community decides what stands.
                  The record never lies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="font-display text-[1.15rem] italic text-[var(--text-muted)]">
              Instead of arguing about where something began — the world will simply look it up.
            </p>

            <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-center">
              <button
                type="button"
                className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-center font-body font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-dim)] md:w-[240px]"
              >
                Create account
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-[var(--accent)] bg-transparent px-6 py-3 text-center font-body font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-glow)] md:w-[240px]"
              >
                Sign in
              </button>
            </div>
          </section>

          {/* Marketing CTA ends above; keep AuthForms below */}
          <section className="pt-0">
            <AuthForms message={message} error={error} />
          </section>
        </div>
      </main>
    </div>
  );
}
