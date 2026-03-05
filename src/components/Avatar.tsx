'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'card' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = { sm: 'h-8 w-8', card: 'h-9 w-9', md: 'h-10 w-10', lg: 'h-12 w-12', xl: 'h-20 w-20' };
const sizePx = { sm: 32, card: 36, md: 40, lg: 48, xl: 80 };

function InitialsFallback({ username, size, className }: { username: string; size: AvatarProps['size']; className: string }) {
  const fallback = username.charAt(0).toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm font-medium text-text-primary ${sizeClasses[size ?? 'sm']} ${className}`}
    >
      {fallback}
    </span>
  );
}

export function Avatar({ username, avatarUrl, size = 'sm', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      <span className={`inline-block rounded-full ring-[1.5px] ring-accent-dim ring-offset-0 ${className}`}>
        <Image
          src={avatarUrl}
          alt={`@${username} avatar`}
          width={sizePx[size]}
          height={sizePx[size]}
          className={`rounded-full object-cover ${sizeClasses[size]}`}
          unoptimized
          onError={() => setImageError(true)}
        />
      </span>
    );
  }

  return (
    <span className={`inline-block rounded-full ring-[1.5px] ring-accent-dim ring-offset-0 ${className}`}>
      <InitialsFallback username={username} size={size} className="" />
    </span>
  );
}
