'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, CLAIM_TYPES } from '@/lib/types';

interface CreateMarkFormProps {
  username: string;
}

export function CreateMarkForm({ username }: CreateMarkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptsDisputes, setAcceptsDisputes] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptsDisputes) return;
    setError(null);
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = {
      content: formData.get('content') as string,
      domain: formData.get('domain') as string,
      claim_type: formData.get('claim_type') as string,
    };

    const res = await fetch('/api/marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? 'Failed to create mark');
      setIsSubmitting(false);
      return;
    }
    router.push(`/mark/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-black">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={4}
          required
          placeholder="Your claim..."
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder-gray-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>
      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-black">
          Domain
        </label>
        <select
          id="domain"
          name="domain"
          required
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="claim_type" className="block text-sm font-medium text-black">
          Claim Type
        </label>
        <select
          id="claim_type"
          name="claim_type"
          required
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          {CLAIM_TYPES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="accepts_disputes"
          type="checkbox"
          checked={acceptsDisputes}
          onChange={(e) => setAcceptsDisputes(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <label htmlFor="accepts_disputes" className="text-sm text-black">
          {username ? `@${username} is marking this as theirs — and accepts disputes.` : 'You are marking this as yours — and accept disputes.'}
        </label>
      </div>
      <p className="text-sm text-amber-700">
        Lose a dispute → your Mark gets supplanted.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !acceptsDisputes}
        className="rounded border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Claim'}
      </button>
    </form>
  );
}
