'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WithdrawContestButtonsProps {
  markId: string;
  hasChallenges: boolean;
  /** Muted inline links (mark detail owner row). */
  quietInline?: boolean;
}

export function WithdrawContestButtons({ markId, hasChallenges, quietInline = false }: WithdrawContestButtonsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [conceding, setConceding] = useState(false);
  const [contestOpen, setContestOpen] = useState(false);
  const [ownerResponse, setOwnerResponse] = useState('');
  const [contestSubmitting, setContestSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (hasChallenges) return;
    setError(null);
    setWithdrawing(true);
    const res = await fetch(`/api/marks/${markId}/withdraw`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to withdraw');
      setWithdrawing(false);
      return;
    }
    router.refresh();
  };

  const handleConcede = async () => {
    if (!hasChallenges) return;
    setError(null);
    setConceding(true);
    const res = await fetch(`/api/marks/${markId}/concede`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to concede');
      setConceding(false);
      return;
    }
    router.refresh();
  };

  const handleContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setContestSubmitting(true);
    const res = await fetch(`/api/marks/${markId}/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_response: ownerResponse || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to save response');
      setContestSubmitting(false);
      return;
    }
    setContestOpen(false);
    setOwnerResponse('');
    router.refresh();
  };

  const linkBtn = quietInline
    ? 'text-xs font-normal text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50 disabled:no-underline'
    : 'text-sm font-normal text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50 disabled:no-underline';

  const sep = <span className="text-muted-foreground/40 select-none" aria-hidden>·</span>;

  return (
    <div className="space-y-2">
      <div
        className={
          quietInline
            ? 'inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5'
            : 'flex flex-wrap items-center gap-x-4 gap-y-1'
        }
      >
        {!hasChallenges && (
          <button type="button" onClick={handleWithdraw} disabled={withdrawing} className={linkBtn}>
            {withdrawing ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
        {hasChallenges && (
          <>
            <button type="button" onClick={handleConcede} disabled={conceding} className={linkBtn}>
              {conceding ? 'Conceding…' : 'Concede'}
            </button>
            {sep}
            <button type="button" onClick={() => setContestOpen(!contestOpen)} className={linkBtn}>
              {contestOpen ? 'Cancel' : 'Contest'}
            </button>
          </>
        )}
      </div>
      {contestOpen && (
        <form onSubmit={handleContest} className="space-y-2 border-t border-border/60 pt-3">
          <label htmlFor="owner_response" className="block text-sm font-medium text-text-primary">
            Owner response (optional)
          </label>
          <textarea
            id="owner_response"
            value={ownerResponse}
            onChange={(e) => setOwnerResponse(e.target.value)}
            rows={2}
            placeholder="Add your response to the challenge..."
            className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
          />
          <button
            type="submit"
            disabled={contestSubmitting}
            className="rounded-xl border border-border bg-accent px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {contestSubmitting ? 'Saving…' : 'Save response'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
