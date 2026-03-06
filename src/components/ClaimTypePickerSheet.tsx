'use client';

import { useEffect, useMemo, useState } from 'react';
import { CLAIM_TYPES, CLAIM_TYPE_DESCRIPTIONS, type ClaimType } from '@/lib/types';

type ClaimTypeOption = {
  id: string;
  name: string;
  description?: string | null;
};

interface ClaimTypePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: ClaimTypeOption) => void;
  selectedId?: string | null;
}

export function ClaimTypePickerSheet({ isOpen, onClose, onSelect, selectedId }: ClaimTypePickerSheetProps) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allClaimTypes, setAllClaimTypes] = useState<ClaimTypeOption[]>([]);

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
        const raw = data.results ?? [];
        const list = raw.filter((r: ClaimTypeOption) => CLAIM_TYPES.includes(r.name as ClaimType));
        list.sort((a: ClaimTypeOption, b: ClaimTypeOption) => CLAIM_TYPES.indexOf(a.name as ClaimType) - CLAIM_TYPES.indexOf(b.name as ClaimType));
        setAllClaimTypes(list);
      })
      .catch(() => setError('Could not load claim types.'))
      .finally(() => setLoading(false));
  }, [isOpen, allClaimTypes.length]);

  useEffect(() => {
    if (!isOpen) return;
    setQ('');
  }, [isOpen]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allClaimTypes;
    return allClaimTypes.filter((item) => item.name.toLowerCase().includes(term));
  }, [allClaimTypes, q]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] w-full sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]">
      <div
        className="max-h-[80vh] overflow-hidden rounded-t-2xl shadow-xl sm:h-full sm:max-h-none sm:rounded-none sm:rounded-r-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Select claim type
          </h3>
          <button type="button" onClick={onClose} className="text-sm hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            Close
          </button>
        </div>
        <div className="space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search claim types..."
            className="w-full rounded-md font-body text-[0.85rem] focus:outline-none"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />

          {loading && (
            <div className="space-y-2">
              <div className="h-11 animate-pulse rounded-lg opacity-60" style={{ background: 'var(--border-subtle)' }} />
              <div className="h-11 animate-pulse rounded-lg opacity-60" style={{ background: 'var(--border-subtle)' }} />
            </div>
          )}

          {error && (
            <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={() => { setAllClaimTypes([]); setError(null); }}
                className="mt-2 rounded-md px-3 py-1 text-xs hover:opacity-90"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div
              className="overflow-y-auto rounded-lg pr-1"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                maxHeight: '280px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) var(--bg-card)',
              }}
            >
              <ul className="py-1">
                {filtered.map((item) => {
                  const desc = CLAIM_TYPE_DESCRIPTIONS[item.name as ClaimType] ?? item.description ?? '';
                  const isSelected = selectedId != null && selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="relative flex w-full items-center justify-between gap-2 text-left font-body transition-colors"
                        style={{
                          padding: '8px 14px',
                          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--accent-glow)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>{item.name}</span>
                        {desc && (
                          <span
                            className="shrink-0 cursor-help rounded-full leading-none opacity-70"
                            style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
                            title={desc}
                            aria-label={`Description: ${desc}`}
                          >
                            ⓘ
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {filtered.length === 0 && (
                <p className="py-4 text-center font-body text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
                  No claim types match your search.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
