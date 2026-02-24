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
      className="flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
    >
      {bookmarked ? '★ Saved' : '☆ Save'}
    </button>
  );
}
