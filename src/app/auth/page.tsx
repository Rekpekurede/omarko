import Link from 'next/link';
import { AuthForms } from '@/components/AuthForms';

interface PageProps {
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function AuthPage({ searchParams }: PageProps) {
  const { message, error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel — pitch (60% desktop, full width mobile) */}
      <div
        className="flex w-full flex-col justify-between bg-[var(--bg-primary)] px-6 py-8 md:w-[60%] md:px-12 md:py-12"
      >
        <div>
          <Link
            href="/"
            className="font-display text-[2rem] font-semibold text-[var(--accent)]"
            aria-label="OMarko home"
          >
            OMarko
          </Link>
          <h1 className="mt-8 font-display text-[2rem] font-semibold leading-tight text-[var(--text-primary)] md:mt-12 md:text-[3rem] md:font-semibold">
            Your ideas deserve
            <br />
            to be on record.
          </h1>
          <p className="mt-4 font-body text-base text-[var(--text-secondary)] md:mt-4">
            OMarko is where you declare what you created,
            <br />
            what you predicted, and what you thought of first.
            <br />
            Post a Mark. Watch your influence spread.
          </p>
          {/* Callouts — hidden on mobile */}
          <div className="mt-8 hidden space-y-6 md:mt-8 md:block">
            <div className="flex gap-4">
              <span className="text-xl text-[var(--accent)]" aria-hidden>🏷</span>
              <div>
                <p className="font-body font-semibold text-[var(--text-primary)]">Post a Mark</p>
                <p className="font-body text-[0.85rem] text-[var(--text-secondary)]">
                  Claim authorship of your idea, invention, phrase, or prediction.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-xl text-[var(--accent)]" aria-hidden>🔗</span>
              <div>
                <p className="font-body font-semibold text-[var(--text-primary)]">Signs of Influence</p>
                <p className="font-body text-[0.85rem] text-[var(--text-secondary)]">
                  Submit evidence that your Mark has spread into the world.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-xl text-[var(--accent)]" aria-hidden>✖</span>
              <div>
                <p className="font-body font-semibold text-[var(--text-primary)]">Challenge & Concede</p>
                <p className="font-body text-[0.85rem] text-[var(--text-secondary)]">
                  The community keeps claims honest — evidence always wins.
                </p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-8 font-display text-[0.9rem] italic text-[var(--text-muted)] md:mt-12">
          &ldquo;Instead of arguing about who came first —
          <br />
          the world will simply look it up.&rdquo;
        </p>
      </div>

      {/* Right panel — form (40% desktop, full width mobile) */}
      <div className="flex w-full flex-col border-t border-[var(--border)] bg-[var(--bg-secondary)] md:w-[40%] md:border-l md:border-t-0">
        <div className="flex flex-1 flex-col justify-center px-6 py-8 md:px-10 md:py-12">
          <AuthForms message={message} error={error} />
          <p className="mt-6 text-center font-body text-sm text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--text-primary)] hover:underline">
              Back to feed
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
