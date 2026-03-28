'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ReportReason = 'not_a_mark' | 'spam' | 'abuse' | 'impersonation';

interface ReportModalProps {
  isOpen: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (reason: ReportReason) => void;
}

const REPORT_REASONS: Array<{ id: ReportReason; label: string }> = [
  { id: 'not_a_mark', label: 'Not a mark' },
  { id: 'spam', label: 'Spam' },
  { id: 'abuse', label: 'Abuse' },
  { id: 'impersonation', label: 'Impersonation' },
];

export function ReportModal({ isOpen, pending, error, onClose, onSubmit }: ReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedReason(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow || 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold text-white">Report this mark</h3>
        <p className="mt-1 text-sm text-[#8A8878]">Choose a reason for this report.</p>
        <div className="mt-4 space-y-3">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setSelectedReason(reason.id);
                onSubmit(reason.id);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selectedReason === reason.id
                  ? 'border-[#C9A84C] bg-[#1A1D24] text-white'
                  : 'border-white/10 bg-[#0A0B0E] text-[#E8E0D0] hover:border-[#C9A84C] hover:bg-[#111318]'
              } disabled:cursor-not-allowed`}
            >
              {reason.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-[#E8E0D0]">{error}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm text-[#8A8878] transition-colors hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

