'use client';

import { useState } from 'react';

interface ReportRow {
  id: string;
  mark_id: string;
  reporter_id: string;
  reason: 'not_a_mark' | 'spam' | 'abuse' | 'impersonation';
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  reviewed_at?: string | null;
  resolved_at?: string | null;
}

interface MarkRow {
  id: string;
  user_id: string;
  content: string | null;
  moderation_status?: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
}

export function AdminReportsClient({
  reports,
  marks,
  reporters,
  owners,
}: {
  reports: ReportRow[];
  marks: MarkRow[];
  reporters: ProfileRow[];
  owners: ProfileRow[];
}) {
  const [rows, setRows] = useState(reports);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const marksById = new Map(marks.map((m) => [m.id, m]));
  const reportersById = new Map(reporters.map((p) => [p.id, p.username]));
  const ownersById = new Map(owners.map((p) => [p.id, p.username]));

  async function updateReport(reportId: string, status: 'reviewed' | 'resolved', moderationStatus?: 'removed_not_a_mark' | 'removed_spam' | 'removed_abuse' | 'removed_impersonation') {
    setPendingId(reportId);
    setError(null);
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, moderation_status: moderationStatus }),
    });
    const data = await res.json().catch(() => ({}));
    setPendingId(null);
    if (!res.ok) {
      setError(data.error ?? 'Failed to update report');
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status, reviewed_at: status === 'reviewed' ? new Date().toISOString() : r.reviewed_at, resolved_at: status === 'resolved' ? new Date().toISOString() : r.resolved_at }
          : r
      )
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
      {rows.map((r) => {
        const mark = marksById.get(r.mark_id);
        const reporter = reportersById.get(r.reporter_id) ?? 'unknown';
        const owner = mark ? ownersById.get(mark.user_id) ?? 'unknown' : 'unknown';
        return (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">{r.reason.replaceAll('_', ' ')}</span>
              <span aria-hidden>·</span>
              <span>{r.status}</span>
              <span aria-hidden>·</span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-foreground">{mark?.content?.slice(0, 240) || '(mark content unavailable)'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reporter: @{reporter} · Owner: @{owner}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pendingId === r.id}
                onClick={() => updateReport(r.id, 'reviewed')}
                className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent/70 disabled:opacity-50"
              >
                Mark reviewed
              </button>
              <button
                type="button"
                disabled={pendingId === r.id}
                onClick={() => updateReport(r.id, 'resolved', r.reason === 'not_a_mark' ? 'removed_not_a_mark' : r.reason === 'spam' ? 'removed_spam' : r.reason === 'abuse' ? 'removed_abuse' : 'removed_impersonation')}
                className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent/70 disabled:opacity-50"
              >
                Resolve & apply moderation
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

