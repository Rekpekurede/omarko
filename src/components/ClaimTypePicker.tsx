'use client';

import { useEffect, useMemo, useState } from 'react';

type ClaimTypeOption = {
  id: string;
  name: string;
  description?: string | null;
  family?: string | null;
};

interface ClaimTypePickerProps {
  selected: ClaimTypeOption | null;
  onSelect: (value: ClaimTypeOption) => void;
  contentHint?: string;
}

function getHeuristicSuggestion(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(will|going to|by 20\d{2})\b/.test(lower)) return 'Prediction';
  if (/\b(i believe|i think)\b/.test(lower)) return 'Opinion';
  if (/\b(i discovered|i found)\b/.test(lower)) return 'Discovery';
  if (/\b(recipe|ingredients)\b/.test(lower)) return 'Recipe';
  return null;
}

export function ClaimTypePicker({ selected, onSelect, contentHint = '' }: ClaimTypePickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClaimTypeOption[]>([]);
  const [mostUsed, setMostUsed] = useState<ClaimTypeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestionSent, setSuggestionSent] = useState<string | null>(null);

  const suggestedName = useMemo(() => getHeuristicSuggestion(contentHint), [contentHint]);
  const suggestedOption = useMemo(
    () => [...mostUsed, ...results].find((x) => x.name.toLowerCase() === (suggestedName ?? '').toLowerCase()) ?? null,
    [mostUsed, results, suggestedName]
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/claim-types?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setResults(data.results ?? []);
          setMostUsed(data.mostUsed ?? []);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError('Failed to load claim types'))
      .finally(() => setLoading(false));
  }, [open, q]);

  const submitSuggestion = async () => {
    const name = q.trim();
    if (!name) return;
    const res = await fetch('/api/claim-types/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Failed to suggest claim type');
      return;
    }
    setSuggestionSent('Suggested - pending review.');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {selected ? (
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
            {selected.name}
          </span>
        ) : (
          <span className="text-sm text-amber-700 dark:text-amber-400">Select a claim type</span>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSuggestionSent(null);
          }}
          className="text-sm text-foreground underline-offset-2 hover:underline"
        >
          {selected ? 'Change' : 'Choose'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose the most accurate label. This helps people find and evaluate your claim.
      </p>
      {suggestedName && suggestedOption && (
        <button
          type="button"
          onClick={() => onSelect(suggestedOption)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Suggested: {suggestedName}
        </button>
      )}
      {selected && (
        <p className="text-xs text-muted-foreground">
          You&apos;re claiming responsibility for a {selected.name}. Confirm?{' '}
          <button type="button" className="underline" onClick={() => setOpen(true)}>
            Change
          </button>
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/50 sm:items-center sm:justify-center">
          <div className="w-full rounded-t-2xl border border-border bg-card p-4 sm:max-w-lg sm:rounded-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Select claim type</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search claim types..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            {loading && <p className="mt-2 text-xs text-muted-foreground">Loading...</p>}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            {mostUsed.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Most used</p>
                <div className="flex flex-wrap gap-2">
                  {mostUsed.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                      }}
                      className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-accent"
                  >
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </button>
                </li>
              ))}
            </ul>

            {!loading && results.length === 0 && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm text-foreground">Can&apos;t find it? Suggest a new claim type.</p>
                <button
                  type="button"
                  onClick={submitSuggestion}
                  className="mt-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                  Suggest &quot;{q.trim() || 'new type'}&quot;
                </button>
                {suggestionSent && <p className="mt-2 text-xs text-emerald-600">{suggestionSent}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
