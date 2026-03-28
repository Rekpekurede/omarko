'use client';

import { useState } from 'react';
import { ReportModal } from './ReportModal';

export function MarkDetailActionsMenu({ markId, canReport }: { markId: string; canReport: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReport = async (reason: 'not_a_mark' | 'spam' | 'abuse' | 'impersonation') => {
    setReportPending(true);
    setError(null);
    const res = await fetch(`/api/marks/${markId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    setReportPending(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to submit report');
      return;
    }
    setReportOpen(false);
    setMenuOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="cursor-pointer rounded p-1 text-text-muted transition-colors duration-150 hover:text-text-primary"
          aria-label="More options"
        >
          <span className="text-lg leading-none">⋯</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border bg-bg-card py-1 shadow-lg">
            <button
              type="button"
              disabled={!canReport}
              onClick={() => setReportOpen(true)}
              className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-bg-card-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {canReport ? 'Report' : 'Report (not available on your mark)'}
            </button>
          </div>
        )}
      </div>
      <ReportModal
        isOpen={reportOpen}
        pending={reportPending}
        error={error}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />
    </>
  );
}

