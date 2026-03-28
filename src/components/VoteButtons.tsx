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
  /** Mark detail: unified stats row includes challenges, survived, SOI */
  challengeCount?: number;
  disputesSurvived?: number;
  soiCount?: number;
  /** When true, only show stats (no vote UI) */
  isWithdrawn?: boolean;
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

function StatSep() {
  return <span className="text-muted-foreground/35 select-none px-1 sm:px-1.5" aria-hidden>|</span>;
}

export function VoteButtons({
  markId,
  canVote,
  isOwnMark = false,
  currentVote = null,
  initialSupportVotes = 0,
  initialOpposeVotes = 0,
  onVoteUpdate,
  challengeCount = 0,
  disputesSurvived = 0,
  soiCount = 0,
  isWithdrawn = false,
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
    if (!canVote || isPending || isWithdrawn) return;
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
      } else setError(data.error ?? 'Failed to vote');
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

  const statsRow = (
    <div className="font-body flex flex-wrap items-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
      <span className="tabular-nums">Challenges: {challengeCount}</span>
      <StatSep />
      <span className="tabular-nums">Survived: {disputesSurvived}</span>
      <StatSep />
      <span className="tabular-nums">SOI: {soiCount}</span>
    </div>
  );

  if (isWithdrawn || !canVote) {
    return (
      <div className="mt-6 space-y-2">
        <div className="font-body flex flex-wrap items-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
          <span className="tabular-nums">Challenges: {challengeCount}</span>
          <StatSep />
          <span className="tabular-nums">Survived: {disputesSurvived}</span>
          <StatSep />
          <span className="tabular-nums">SOI: {soiCount}</span>
        </div>
        {isWithdrawn && (
          <p className="text-[11px] text-muted-foreground sm:text-xs" title="Voting is disabled for withdrawn marks">
            Voting unavailable for withdrawn marks.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {statsRow}
      <div className="font-body grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-xl sm:gap-3">
        <button
          type="button"
          onClick={() => handleVote('SUPPORT')}
          disabled={isPending}
          className={`min-h-[44px] w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 sm:w-auto sm:min-w-[140px] bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/25 hover:brightness-110 dark:from-emerald-600 dark:to-emerald-800 ${
            vote === 'SUPPORT' ? 'ring-2 ring-emerald-400/50 shadow-lg' : ''
          }`}
        >
          <span className="inline-flex items-baseline gap-2">
            <span aria-hidden>Support</span>
            <span className="text-[11px] font-semibold opacity-90 tabular-nums">({supportVotes})</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleVote('OPPOSE')}
          disabled={isPending || isOwnMark}
          className={`min-h-[44px] w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 sm:w-auto sm:min-w-[140px] ${
            vote === 'OPPOSE'
              ? 'border-red-400/60 bg-red-500/10 text-red-200 ring-1 ring-red-400/30'
              : 'border-white/15 text-zinc-400 hover:border-red-400/40 hover:bg-red-500/5 hover:text-red-200 dark:border-white/10 dark:text-zinc-500 dark:hover:border-red-500/35 dark:hover:text-red-300'
          }`}
        >
          <span className="inline-flex items-baseline gap-2">
            <span aria-hidden>Oppose</span>
            <span className="text-[11px] font-semibold opacity-90 tabular-nums">({opposeVotes})</span>
          </span>
        </button>
      </div>
      {vote && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-xs font-medium text-muted-foreground">
            {vote === 'SUPPORT'
              ? isOwnMark
                ? 'You’re supporting your mark.'
                : 'You’re supporting this mark.'
              : 'You opposed this mark.'}
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50 sm:text-left"
          >
            Remove vote
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {toast && <p className="text-sm text-amber-600 dark:text-amber-400">{toast}</p>}
    </div>
  );
}
