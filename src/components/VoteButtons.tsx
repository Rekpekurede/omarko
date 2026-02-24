'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VoteButtonsProps {
  markId: string;
  canVote: boolean;
  currentVote?: 'SUPPORT' | 'OPPOSE' | null;
}

export function VoteButtons({ markId, canVote, currentVote = null }: VoteButtonsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleVote = async (voteType: 'SUPPORT' | 'OPPOSE') => {
    if (!canVote || isPending) return;
    setError(null);
    setIsPending(true);
    const method = currentVote ? 'PATCH' : 'POST';
    const res = await fetch(`/api/marks/${markId}/vote`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_type: voteType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401) setError('You must sign in to vote.');
      else if (res.status === 409) setError('You have already voted on this mark.');
      else if (res.status === 400) setError(data.error ?? 'Invalid request.');
      else setError(data.error ?? 'Failed to vote');
      setIsPending(false);
      return;
    }
    router.refresh();
  };

  const handleRemove = async () => {
    if (!canVote || isPending) return;
    setError(null);
    setIsPending(true);
    const res = await fetch(`/api/marks/${markId}/vote`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to remove vote');
      setIsPending(false);
      return;
    }
    router.refresh();
  };

  if (!canVote) {
    return (
      <span className="text-sm text-gray-500">
        You cannot vote (you may be the author).
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleVote('SUPPORT')}
          disabled={isPending}
          className={`rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            currentVote === 'SUPPORT' ? 'border-black bg-black text-white' : 'border-black bg-white text-black hover:bg-gray-100'
          }`}
        >
          Support
        </button>
        <button
          type="button"
          onClick={() => handleVote('OPPOSE')}
          disabled={isPending}
          className={`rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            currentVote === 'OPPOSE' ? 'border-black bg-black text-white' : 'border-black bg-white text-black hover:bg-gray-100'
          }`}
        >
          Oppose
        </button>
        {currentVote && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
