import type { Metadata } from 'next';
import { PageContainer } from '@/components/PageContainer';

export const metadata: Metadata = {
  title: 'OMarko — Private',
  robots: { index: false, follow: false },
};

export default function ClosedPage() {
  return (
    <PageContainer className="py-16 sm:py-24">
      <div className="rounded-2xl border border-border bg-card p-8 text-center dark:bg-card-glass dark:backdrop-blur-sm sm:p-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          OMarko is currently private.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          We&apos;re refining the platform before reopening access.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          If you&apos;ve been invited to view OMarko, please contact me directly.
        </p>
      </div>
    </PageContainer>
  );
}
