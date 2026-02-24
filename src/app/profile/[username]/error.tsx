'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ProfileError]', error);
  }, [error]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-gray-600">We couldn&apos;t load this profile. Please try again.</p>
      <div className="mt-4 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded border border-black bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
