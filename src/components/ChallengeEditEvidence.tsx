'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChallengeEditEvidenceProps {
  challengeId: string;
  currentEvidenceUrl?: string | null;
  currentClaimedDate?: string | null;
}

export function ChallengeEditEvidence({ challengeId, currentEvidenceUrl, currentClaimedDate }: ChallengeEditEvidenceProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState(currentEvidenceUrl ?? '');
  const [claimedOriginalDate, setClaimedOriginalDate] = useState(
    typeof currentClaimedDate === 'string' ? currentClaimedDate : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const evidenceUrlVal = typeof evidenceUrl === 'string' ? evidenceUrl.trim() || null : null;
    const claimedOriginalDateVal = (typeof claimedOriginalDate === 'string' && claimedOriginalDate.trim() !== '' && claimedOriginalDate.trim() !== 'false') ? claimedOriginalDate.trim() : null;
    const res = await fetch(`/api/challenges/${challengeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceUrl: evidenceUrlVal,
        claimedOriginalDate: claimedOriginalDateVal,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to update');
      setSubmitting(false);
      return;
    }
    setOpen(false);
    router.refresh();
    setSubmitting(false);
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Add / edit evidence
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-xl border border-border bg-bg-card p-2">
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="Evidence URL"
            className="w-full rounded-xl border border-border bg-bg-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
          />
          <input
            type="text"
            value={claimedOriginalDate}
            onChange={(e) => setClaimedOriginalDate(e.target.value)}
            placeholder="Claimed original date (e.g. YYYY-MM-DD)"
            className="w-full rounded-xl border border-border bg-bg-card px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent caret-text-primary"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-xl bg-accent px-2 py-1 text-xs font-medium text-black hover:opacity-90 disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-2 py-1 text-xs text-text-primary hover:bg-bg-card-hover">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
