'use client';

import { useEffect, useMemo, useState } from 'react';

type ClaimTypeOption = {
  id: string;
  name: string;
  description?: string | null;
};

interface ClaimTypePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: ClaimTypeOption) => void;
}

const SUGGESTED_NAMES = [
  'Creation',
  'Discovery',
  'Method',
  'Prediction',
  'Theory',
  'Teaching',
  'Stance',
  'Opinion',
];

export function ClaimTypePickerSheet({ isOpen, onClose, onSelect }: ClaimTypePickerSheetProps) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allClaimTypes, setAllClaimTypes] = useState<ClaimTypeOption[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (allClaimTypes.length > 0) return;
    setLoading(true);
    setError(null);
    fetch('/api/claim-types')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError('Could not load claim types.');
          return;
        }
        setAllClaimTypes(data.results ?? []);
      })
      .catch(() => setError('Could not load claim types.'))
      .finally(() => setLoading(false));
  }, [isOpen, allClaimTypes.length]);

  useEffect(() => {
    if (!isOpen) return;
    setSuggestionSent(null);
    setQ('');
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allClaimTypes;
    return allClaimTypes.filter((item) => item.name.toLowerCase().includes(term));
  }, [allClaimTypes, q]);

  const suggested = useMemo(() => {
    const byName = new Map(filtered.map((item) => [item.name.toLowerCase(), item]));
    return SUGGESTED_NAMES
      .map((name) => byName.get(name.toLowerCase()))
      .filter((item): item is ClaimTypeOption => !!item);
  }, [filtered]);

  const allWithoutSuggested = useMemo(() => {
    const suggestedIds = new Set(suggested.map((item) => item.id));
    return filtered.filter((item) => !suggestedIds.has(item.id));
  }, [filtered, suggested]);

  const showEmpty = !loading && !error && suggested.length === 0 && allWithoutSuggested.length === 0;

  const handleSuggest = async () => {
    const name = q.trim();
    if (!name) return;
    setSuggesting(true);
    const res = await fetch('/api/claim-types/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSuggesting(false);
    if (res.ok) {
      setSuggestionSent('Suggested - pending review.');
    } else {
      setSuggestionSent('Could not send suggestion right now.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] w-full sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]">
      <div className="max-h-[80vh] overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:h-full sm:max-h-none sm:rounded-none sm:rounded-r-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-foreground">Select claim type</h3>
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <div className="space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search claim types..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          />

          {loading && (
            <div className="space-y-2">
              <div className="h-11 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-11 animate-pulse rounded-lg bg-muted/60" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm text-foreground">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setAllClaimTypes([]);
                  setError(null);
                }}
                className="mt-2 rounded-md border border-border bg-card px-3 py-1 text-xs text-foreground hover:bg-accent"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1 sm:max-h-[calc(100vh-7rem)]">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested claim types</p>
                <div className="flex flex-wrap gap-2">
                  {suggested.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground hover:bg-accent"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">All claim types</p>
                <ul className="space-y-2">
                  {allWithoutSuggested.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-accent"
                      >
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {showEmpty && (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-sm text-foreground">No claim types found.</p>
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={!q.trim() || suggesting}
                    className="mt-2 rounded-md border border-border bg-card px-3 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    {suggesting ? 'Sending...' : `Suggest "${q.trim() || 'new type'}"`}
                  </button>
                  {suggestionSent && <p className="mt-2 text-xs text-muted-foreground">{suggestionSent}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
