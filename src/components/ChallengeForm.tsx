'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChallengeFormProps {
  markId: string;
  canChallenge: boolean;
  challengeDisabledReason?: string;
}

export function ChallengeForm({ markId, canChallenge, challengeDisabledReason }: ChallengeFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canChallenge || isPending) return;
    setError(null);
    setIsPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get('text') as string;
    const evidenceUrlRaw = formData.get('evidence_url');
    const claimedOriginalDateRaw = formData.get('claimed_original_date');
    const evidenceUrl =
      typeof evidenceUrlRaw === 'string' && evidenceUrlRaw.trim() !== ''
        ? evidenceUrlRaw.trim()
        : null;
    const rawDate =
      claimedOriginalDateRaw && typeof claimedOriginalDateRaw === 'string' && claimedOriginalDateRaw.trim() !== ''
        ? claimedOriginalDateRaw.trim()
        : null;
    const claimedOriginalDate = rawDate !== null && rawDate !== '' && rawDate !== 'false' ? rawDate : null;

    const payload: { text: string; evidenceUrl: string | null; claimedOriginalDate: string | null } = {
      text: text.trim(),
      evidenceUrl,
      claimedOriginalDate: claimedOriginalDate ?? null,
    };

    const res = await fetch(`/api/marks/${markId}/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) setError('You must sign in to challenge.');
      else if (res.status === 409) setError('You have already challenged this mark.');
      else if (res.status === 403) setError('You cannot challenge your own mark.');
      else setError(data.error ?? 'Failed to submit challenge');
      setIsPending(false);
      return;
    }
    form.reset();
    router.refresh();
    setIsPending(false);
  };

  if (!canChallenge) {
    return (
      <p className="text-sm text-text-muted" title={challengeDisabledReason}>
        {challengeDisabledReason ?? 'You cannot challenge this mark (you may be the author or have already challenged).'}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="text" className="block text-sm font-medium text-text-primary">
        Challenge text
      </label>
      <textarea
        id="text"
        name="text"
        rows={3}
        required
        placeholder="Your challenge or reasoning..."
        className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
      />
      <label htmlFor="evidence_url" className="block text-sm font-medium text-text-secondary">
        Evidence URL (optional; evidence-backed challenges count toward CHALLENGED)
      </label>
      <input
        id="evidence_url"
        name="evidence_url"
        type="url"
        placeholder="https://..."
        className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
      />
      <label htmlFor="claimed_original_date" className="block text-sm font-medium text-text-secondary">
        Claimed original date (optional)
      </label>
      <input
        id="claimed_original_date"
        name="claimed_original_date"
        type="text"
        placeholder="YYYY-MM-DD"
        className="w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl border border-border bg-accent px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Challenge'}
      </button>
    </form>
  );
}
