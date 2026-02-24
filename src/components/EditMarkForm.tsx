'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EditMarkFormProps {
  markId: string;
  currentContent: string;
  onCancel: () => void;
}

export function EditMarkForm({ markId, currentContent, onCancel }: EditMarkFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(currentContent);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/marks/${markId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to save');
      setSubmitting(false);
      return;
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        required
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="rounded border border-black bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
