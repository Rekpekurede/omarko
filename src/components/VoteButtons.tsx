'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface VoteButtonsProps {
  markId: string;
  canVote: boolean;
  isOwnMark?: boolean;
  currentVote?: 'SUPPORT' | 'OPPOSE' | null;
  initialSupportVotes?: number;
  initialOpposeVotes?: number;
  onVoteUpdate?: (updated: { support_votes?: number; oppose_votes?: number; userVote?: 'SUPPORT' | 'OPPOSE' | null }) => void;
}

function applyVoteTransition(
  prevVote: 'SUPPORT' | 'OPPOSE' | null,
  nextVote: 'SUPPORT' | 'OPPOSE'
): { vote: 'SUPPORT' | 'OPPOSE' | null; supportDelta: number; opposeDelta: number } {
  if (prevVote === nextVote) {
    return {
      vote: null,
      supportDelta: nextVote === 'SUPPORT' ? -1 : 0,
      opposeDelta: nextVote === 'OPPOSE' ? -1 : 0,
    };
  }
  if (prevVote === null) {
    return {
      vote: nextVote,
      supportDelta: nextVote === 'SUPPORT' ? 1 : 0,
      opposeDelta: nextVote === 'OPPOSE' ? 1 : 0,
    };
  }
  return {
    vote: nextVote,
    supportDelta: nextVote === 'SUPPORT' ? 1 : -1,
    opposeDelta: nextVote === 'OPPOSE' ? 1 : -1,
  };
}

export function VoteButtons({
  markId,
  canVote,
  isOwnMark = false,
  currentVote = null,
  initialSupportVotes = 0,
  initialOpposeVotes = 0,
  onVoteUpdate,
}: VoteButtonsProps) {
  const router = useRouter();
  const [vote, setVote] = useState<'SUPPORT' | 'OPPOSE' | null>(currentVote);
  const [supportVotes, setSupportVotes] = useState(initialSupportVotes);
  const [opposeVotes, setOpposeVotes] = useState(initialOpposeVotes);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setVote(currentVote);
    setSupportVotes(initialSupportVotes);
    setOpposeVotes(initialOpposeVotes);
  }, [currentVote, initialSupportVotes, initialOpposeVotes]);

  const handleVote = async (voteType: 'SUPPORT' | 'OPPOSE') => {
    if (!canVote || isPending) return;
    if (isOwnMark && voteType === 'OPPOSE') {
      setToast('You cannot oppose your own mark.');
      setTimeout(() => setToast(null), 2200);
      return;
    }
    setError(null);
    setIsPending(true);

    const prev = {
      vote,
      supportVotes,
      opposeVotes,
    };
    const optimistic = applyVoteTransition(vote, voteType);
    setVote(optimistic.vote);
    setSupportVotes((v) => Math.max(0, v + optimistic.supportDelta));
    setOpposeVotes((v) => Math.max(0, v + optimistic.opposeDelta));

    const res = await fetch(`/api/marks/${markId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setVote(prev.vote);
      setSupportVotes(prev.supportVotes);
      setOpposeVotes(prev.opposeVotes);
      if (res.status === 401) setError('You must sign in to vote.');
      else if (res.status === 409) setError('You have already voted on this mark.');
      else if (res.status === 400) {
        setError(data.error ?? 'Invalid request.');
        if (typeof data.error === 'string' && data.error.toLowerCase().includes('cannot oppose your own')) {
          setToast(data.error);
          setTimeout(() => setToast(null), 2200);
        }
      }
      else setError(data.error ?? 'Failed to vote');
      setIsPending(false);
      return;
    }
    setVote((data.userVote as 'SUPPORT' | 'OPPOSE' | null) ?? null);
    setSupportVotes((data.support_votes as number | undefined) ?? prev.supportVotes);
    setOpposeVotes((data.oppose_votes as number | undefined) ?? prev.opposeVotes);
    onVoteUpdate?.(data);
    router.refresh();
    setIsPending(false);
  };

  const handleRemove = async () => {
    if (vote) {
      await handleVote(vote);
    }
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
        <span>Support: {supportVotes}</span>
        <span>Oppose: {opposeVotes}</span>
        <span>{vote === 'SUPPORT' ? (isOwnMark ? 'Supported (you)' : 'Supported') : vote === 'OPPOSE' ? 'Opposed' : 'No vote'}</span>
      </div>
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
          disabled={isPending || isOwnMark}
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
      {toast && <p className="text-sm text-amber-600 dark:text-amber-400">{toast}</p>}
    </div>
  );
}
