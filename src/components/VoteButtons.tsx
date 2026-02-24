'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VoteButtonsProps {
  markId: string;
  canVote: boolean;
  currentVote?: 'SUPPORT' | 'OPPOSE' | null;
}

export function VoteButtons({ markId, canVote, currentVote = null }: VoteButtonsProps) {
  const router = useRouter();
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setVote(currentVote);
  }, [currentVote]);

  const handleVote = async (voteType: 'SUPPORT' | 'OPPOSE') => {
    if (!canVote || isPending) return;
    setError(null);
    setIsPending(true);

    const prevVote = vote;
    const method = prevVote ? 'PATCH' : 'POST';
    const res = await fetch(`/api/marks/${markId}/vote`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: voteType }),
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
    setVote(voteType);
    router.refresh();
    setIsPending(false);
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
    setVote(null);
    router.refresh();
    setIsPending(false);
  };

  if (!canVote) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400">
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
          className={`min-h-[44px] touch-manipulation rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            vote === 'SUPPORT'
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-black bg-white text-black hover:bg-gray-100 dark:border-gray-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          Support
        </button>
        <button
          type="button"
          onClick={() => handleVote('OPPOSE')}
          disabled={isPending}
          className={`min-h-[44px] touch-manipulation rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
            vote === 'OPPOSE'
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-black bg-white text-black hover:bg-gray-100 dark:border-gray-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
          }`}
        >
          Oppose
        </button>
        {vote && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="min-h-[44px] touch-manipulation rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
