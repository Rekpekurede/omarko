'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  username: string;
  initialFollowing: boolean;
  onUpdate?: (following: boolean, followersCount: number, followingCount: number) => void;
}

export function FollowButton({ username, initialFollowing, onUpdate }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending) return;
    setPending(true);
    const endpoint = following ? 'unfollow' : 'follow';
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}/${endpoint}`, {
      method: 'POST',
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (res.ok) {
      setFollowing(data.following ?? !following);
      onUpdate?.(data.following, data.followersCount ?? 0, data.followingCount ?? 0);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        following ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      {pending ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
