'use client';

import { useEffect, useState } from 'react';
import { DOMAINS } from '@/lib/types';
import { ClaimTypePicker } from '@/components/ClaimTypePicker';

interface PostingDefaultsSectionProps {
  initialDefaultDomain: string | null;
  initialDefaultClaimType: string | null;
}

export function PostingDefaultsSection({
  initialDefaultDomain,
  initialDefaultClaimType,
}: PostingDefaultsSectionProps) {
  const [defaultDomain, setDefaultDomain] = useState<string>(initialDefaultDomain ?? '');
  const [defaultClaimType, setDefaultClaimType] = useState<{ id: string; name: string } | null>(
    initialDefaultClaimType ? { id: `default-${initialDefaultClaimType}`, name: initialDefaultClaimType } : null
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultsUnavailable, setDefaultsUnavailable] = useState(false);

  useEffect(() => {
    fetch('/api/profile/defaults')
      .then((res) => {
        if (res.status === 503 || !res.ok) {
          setDefaultsUnavailable(true);
        }
      })
      .catch(() => setDefaultsUnavailable(true));
  }, []);

  const saveDefaults = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/profile/defaults', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultDomain: defaultDomain || null,
        defaultClaimType: defaultClaimType?.name ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to save defaults');
      return;
    }
    setToast('Defaults saved');
    setTimeout(() => setToast(null), 1600);
  };

  if (defaultsUnavailable) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground">Posting Defaults</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Posting defaults are not available right now. You can still set domain and claim type on each post.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-base font-semibold text-foreground">Posting Defaults</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        These will be automatically selected when you create a post. You can still change them per post.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="posting-default-domain" className="block text-sm font-medium text-foreground">
            Default Domain
          </label>
          <select
            id="posting-default-domain"
            value={defaultDomain}
            onChange={(e) => setDefaultDomain(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">None</option>
            {DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-foreground">Default Claim Type</label>
            {defaultClaimType && (
              <button
                type="button"
                onClick={() => setDefaultClaimType(null)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-1">
            <ClaimTypePicker selected={defaultClaimType} onSelect={setDefaultClaimType} />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {toast && <p className="mt-3 text-sm text-emerald-600">{toast}</p>}
      <div className="mt-4">
        <button
          type="button"
          disabled={saving}
          onClick={saveDefaults}
          className="rounded-xl border border-border bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Defaults'}
        </button>
      </div>
    </section>
  );
}
