'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'card' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Certificate style: 1px amber border + inner shadow (for mark cards) */
  variant?: 'default' | 'certificate';
}

/* Oval thumbprint ratio ~1:1.2 (width:height) */
const sizeClasses = {
  sm: 'w-8 h-[38px]',
  card: 'w-[38px] h-[46px]',
  md: 'w-10 h-12',
  lg: 'w-12 h-[58px]',
  xl: 'w-20 h-24',
};
const sizePx = { sm: [32, 38], card: [38, 46], md: [40, 48], lg: [48, 58], xl: [80, 96] } as const;
const ovalRadius = 'rounded-[50%]'; /* ellipse when width !== height */

const certificateRing = 'ring-[1.5px] ring-[var(--accent)] ring-offset-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]';
const defaultRing = 'ring-[1.5px] ring-[var(--accent)] ring-offset-0';

function InitialsFallback({ username, size, className }: { username: string; size: AvatarProps['size']; className: string }) {
  const fallback = username.charAt(0).toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-bg-secondary text-sm font-medium text-text-primary ${ovalRadius} ${sizeClasses[size ?? 'sm']} ${className}`}
    >
      {fallback}
    </span>
  );
}

export function Avatar({ username, avatarUrl, size = 'sm', className = '', variant }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const ringClass = variant === 'certificate' ? certificateRing : defaultRing;
  const s = size ?? 'sm';
  const [w, h] = sizePx[s];

  if (avatarUrl && !imageError) {
    return (
      <span className={`inline-block overflow-hidden ${ovalRadius} ${ringClass} ${sizeClasses[s]} ${className}`}>
        <Image
          src={avatarUrl}
          alt={`@${username} avatar`}
          width={w}
          height={h}
          className={`object-cover ${ovalRadius} ${sizeClasses[s]}`}
          unoptimized
          onError={() => setImageError(true)}
        />
      </span>
    );
  }

  return (
    <span className={`inline-block ${ovalRadius} ${ringClass} ${sizeClasses[s]} ${className}`}>
      <InitialsFallback username={username} size={size} className="" />
    </span>
  );
}
