'use client';

import { useEffect, useMemo, useState } from 'react';

type ClaimTypeOption = {
  id: string;
  name: string;
  description?: string | null;
};

interface ClaimTypePickerProps {
  selected: ClaimTypeOption | null;
  onSelect: (value: ClaimTypeOption) => void;
  contentHint?: string;
}

const CURATED_SUGGESTED_NAMES = [
  'Creation',
  'Discovery',
  'Statement',
  'Opinion',
  'Stance',
  'Method',
  'Teaching',
];

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
  const [allClaimTypes, setAllClaimTypes] = useState<ClaimTypeOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestionSent, setSuggestionSent] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const suggestedName = useMemo(() => getHeuristicSuggestion(contentHint), [contentHint]);
  const filteredAll = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allClaimTypes;
    return allClaimTypes.filter((x) => x.name.toLowerCase().includes(term));
  }, [allClaimTypes, q]);

  const suggestedSection = useMemo(() => {
    const byLowerName = new Map(filteredAll.map((item) => [item.name.toLowerCase(), item]));
    return CURATED_SUGGESTED_NAMES
      .map((name) => byLowerName.get(name.toLowerCase()))
      .filter((item): item is ClaimTypeOption => !!item);
  }, [filteredAll]);

  const allWithoutSuggested = useMemo(() => {
    const suggestedIds = new Set(suggestedSection.map((item) => item.id));
    return filteredAll.filter((item) => !suggestedIds.has(item.id));
  }, [filteredAll, suggestedSection]);

  const suggestedOption = useMemo(
    () => allClaimTypes.find((x) => x.name.toLowerCase() === (suggestedName ?? '').toLowerCase()) ?? null,
    [allClaimTypes, suggestedName]
  );

  const loadClaimTypes = () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    fetch('/api/claim-types')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setAllClaimTypes(data.results ?? []);
          setWarning(data.warning ?? null);
        } else {
          setError('Could not load claim types right now. Please try again.');
        }
      })
      .catch(() => setError('Could not load claim types right now. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    if (allClaimTypes.length > 0) return;
    loadClaimTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setShowAll(false);
  }, [q]);

  const renderClaimTypeButton = (item: ClaimTypeOption) => (
    <button
      key={item.id}
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
  );

  const visibleAllList = showAll ? allWithoutSuggested : allWithoutSuggested.slice(0, 12);

  const noMatches = !loading && !error && suggestedSection.length === 0 && allWithoutSuggested.length === 0 && q.trim().length > 0;

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
            {warning && <p className="mt-2 text-xs text-amber-600">{warning}</p>}
            {loading && (
              <div className="mt-3 space-y-2">
                <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
                <div className="h-10 animate-pulse rounded-lg bg-muted/60" />
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm text-foreground">{error}</p>
                <button
                  type="button"
                  onClick={loadClaimTypes}
                  className="mt-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && suggestedSection.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Suggested claim types</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSection.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                      }}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">All claim types</p>
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {visibleAllList.map((item) => (
                    <li key={item.id}>{renderClaimTypeButton(item)}</li>
                  ))}
                </ul>
                {!showAll && allWithoutSuggested.length > 12 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    More
                  </button>
                )}
              </div>
            )}

            {noMatches && (
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
