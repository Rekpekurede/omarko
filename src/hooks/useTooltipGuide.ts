'use client';

import { useCallback } from 'react';

const STORAGE_KEY = 'omarko_seen_tooltips';

function getStored(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function setStored(keys: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // fail silently
  }
}

/**
 * Tracks which tooltips the user has already seen.
 * Uses localStorage key: 'omarko_seen_tooltips'
 */
export function useTooltipGuide() {
  const hasSeen = useCallback((key: string): boolean => {
    return getStored().includes(key);
  }, []);

  const markSeen = useCallback((key: string) => {
    const next = [...new Set([...getStored(), key])];
    setStored(next);
  }, []);

  return { hasSeen, markSeen };
}
