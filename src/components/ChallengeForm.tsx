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
    const claimedOriginalDate =
      claimedOriginalDateRaw && typeof claimedOriginalDateRaw === 'string' && claimedOriginalDateRaw.trim() !== ''
        ? claimedOriginalDateRaw.trim()
        : null;

    const payload: { text: string; evidenceUrl: string | null; claimedOriginalDate: string | null } = {
      text: text.trim(),
      evidenceUrl,
      claimedOriginalDate,
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
      <p className="text-sm text-gray-500" title={challengeDisabledReason}>
        {challengeDisabledReason ?? 'You cannot challenge this mark (you may be the author or have already challenged).'}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="text" className="block text-sm font-medium text-black">
        Challenge text
      </label>
      <textarea
        id="text"
        name="text"
        rows={3}
        required
        placeholder="Your challenge or reasoning..."
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />
      <label htmlFor="evidence_url" className="block text-sm font-medium text-gray-600">
        Evidence URL (optional; evidence-backed challenges count toward CHALLENGED)
      </label>
      <input
        id="evidence_url"
        name="evidence_url"
        type="url"
        placeholder="https://..."
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />
      <label htmlFor="claimed_original_date" className="block text-sm font-medium text-gray-600">
        Claimed original date (optional)
      </label>
      <input
        id="claimed_original_date"
        name="claimed_original_date"
        type="text"
        placeholder="YYYY-MM-DD"
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-black bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Challenge'}
      </button>
    </form>
  );
}
