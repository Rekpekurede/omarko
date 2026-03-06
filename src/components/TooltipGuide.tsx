'use client';

import React, { cloneElement, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTooltipGuide } from '@/hooks/useTooltipGuide';

interface TooltipGuideProps {
  /** Unique key for this tooltip type (e.g. 'support', 'challenge'). Show once per key per user. */
  tooltipKey: string;
  /** Text shown in the tooltip bubble. */
  tooltipText: string;
  /** If true, and user is not logged in, redirect to /auth on click instead of showing tooltip. */
  requiresAuth?: boolean;
  /** Current user id when logged in. When requiresAuth and this is null, redirect on click. */
  currentUserId?: string | null;
  /** Single child element (button or link) that accepts onClick. */
  children: React.ReactElement;
}

export function TooltipGuide({
  tooltipKey,
  tooltipText,
  requiresAuth = false,
  currentUserId = null,
  children,
}: TooltipGuideProps) {
  const router = useRouter();
  const { hasSeen, markSeen } = useTooltipGuide();
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setShow(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    timeoutRef.current = setTimeout(dismiss, 3000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [show, dismiss]);

  useEffect(() => {
    if (!show) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [show, dismiss]);

  const handleChildClick = useCallback(
    (e: React.MouseEvent) => {
      if (requiresAuth && !currentUserId) {
        e.preventDefault();
        e.stopPropagation();
        router.push('/auth');
        return;
      }
      if (!hasSeen(tooltipKey)) {
        markSeen(tooltipKey);
        setShow(true);
      }
    },
    [requiresAuth, currentUserId, router, tooltipKey, hasSeen, markSeen]
  );

  const child = React.Children.only(children);
  const mergedOnClick = (e: React.MouseEvent) => {
    handleChildClick(e);
    if (typeof child.props.onClick === 'function') child.props.onClick(e);
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {cloneElement(child, { onClick: mergedOnClick })}
      {show && (
        <div
          className="absolute left-1/2 z-[60] -translate-x-1/2 pb-2 pt-1 [animation-fill-mode:forwards]"
          style={{ bottom: '100%' }}
          role="tooltip"
        >
          <div
            className="animate-fade-in rounded-lg border px-3 py-2 font-body text-[0.8rem] shadow-lg [animation-fill-mode:forwards]"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--accent)',
              color: 'var(--text-primary)',
            }}
          >
            {tooltipText}
            {/* Arrow pointing down toward the button */}
            <div
              className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-[6px] border-transparent"
              style={{ borderTopColor: 'var(--bg-card)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
