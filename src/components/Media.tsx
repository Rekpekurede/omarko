'use client';

import React from 'react';

function pickAspectRatio(ratio: number): number {
  if (ratio >= 1.2) return 16 / 9;
  if (ratio >= 0.9) return 1;
  return 4 / 5;
}

export interface MediaProps {
  src: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
  className?: string;
  onClick?: () => void;
  /** Optional: render as button for tap-to-expand (lightbox-ready) */
  interactive?: boolean;
}

export function Media({
  src,
  alt = '',
  width,
  height,
  className = '',
  onClick,
  interactive = false,
}: MediaProps) {
  const [naturalRatio, setNaturalRatio] = React.useState<number | null>(
    width != null && height != null && height > 0 ? width / height : null
  );

  const aspect = pickAspectRatio(naturalRatio ?? 1);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight && naturalRatio === null) {
      setNaturalRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  const containerClass = [
    'relative w-full overflow-hidden rounded-xl',
    'max-h-[70vh] sm:max-h-[520px]',
    'bg-transparent',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <div
      className={containerClass}
      style={{ aspectRatio: String(aspect) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        onLoad={handleLoad}
        loading="lazy"
      />
    </div>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        aria-label="Open media preview"
      >
        {content}
      </button>
    );
  }

  return content;
}
