'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WithdrawContestButtonsProps {
  markId: string;
  hasChallenges: boolean;
}

export function WithdrawContestButtons({ markId, hasChallenges }: WithdrawContestButtonsProps) {
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!hasChallenges && (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="rounded border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {withdrawing ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
        {hasChallenges && (
          <button
            type="button"
            onClick={handleConcede}
            disabled={conceding}
            className="rounded border border-amber-600 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          >
            {conceding ? 'Conceding…' : 'Concede'}
          </button>
        )}
        {hasChallenges && (
          <button
            type="button"
            onClick={() => setContestOpen(!contestOpen)}
            className="rounded border border-black bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100"
          >
            Contest
          </button>
        )}
      </div>
      {contestOpen && (
        <form onSubmit={handleContest} className="space-y-2 border-t border-gray-200 pt-2">
          <label htmlFor="owner_response" className="block text-sm font-medium text-black">
            Owner response (optional)
          </label>
          <textarea
            id="owner_response"
            value={ownerResponse}
            onChange={(e) => setOwnerResponse(e.target.value)}
            rows={2}
            placeholder="Add your response to the dispute..."
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button
            type="submit"
            disabled={contestSubmitting}
            className="rounded border border-black bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {contestSubmitting ? 'Saving…' : 'Save response'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
