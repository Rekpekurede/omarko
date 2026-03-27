'use client';

import { useEffect, useRef } from 'react';
import { captureEvent } from '@/lib/posthog-client';

interface EventTrackerProps {
  event: string;
  properties?: Record<string, unknown>;
}

export function EventTracker({ event, properties }: EventTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    captureEvent(event, properties);
  }, [event, properties]);

  return null;
}

