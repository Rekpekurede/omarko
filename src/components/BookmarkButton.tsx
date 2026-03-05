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
      className="flex min-h-[40px] cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-[0.8rem] font-medium text-text-muted transition-colors duration-150 hover:text-accent disabled:opacity-50"
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark for later'}
    >
      {bookmarked ? <span className="text-accent">★</span> : '☆'} {bookmarked ? 'Saved' : 'Save'}
    </button>
  );
}
