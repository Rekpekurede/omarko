'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BookmarkButtonProps {
  markId: string;
  bookmarked: boolean;
}

export function BookmarkButton({ markId, bookmarked: initialBookmarked }: BookmarkButtonProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    const method = bookmarked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/marks/${markId}/bookmark`, { method });
    setPending(false);
    if (res.ok) {
      setBookmarked(!bookmarked);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
    >
      {bookmarked ? '★ Saved' : '☆ Save'}
    </button>
  );
}
