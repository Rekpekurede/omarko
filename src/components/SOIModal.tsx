'use client';

import { useEffect, useState } from 'react';

const STORAGE_BUCKET = 'mark-media';

function toPublicUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path.replace(/^\//, '')}`;
}

interface SoiRow {
  id: string;
  mark_id: string;
  url: string;
}

interface SOIModalProps {
  markId: string;
  count: number;
  open: boolean;
  onClose: () => void;
}

export function SOIModal({ markId, count, open, onClose }: SOIModalProps) {
  const [soi, setSoi] = useState<SoiRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !markId) return;
    setLoading(true);
    fetch(`/api/marks/${markId}/soi`)
      .then((res) => res.json())
      .then((data) => {
        setSoi(Array.isArray(data.soi) ? data.soi : []);
      })
      .catch(() => setSoi([]))
      .finally(() => setLoading(false));
  }, [open, markId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg dark:bg-card"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Signs of Influence ({count})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : soi.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signs of influence yet.</p>
          ) : (
            <ul className="space-y-3">
              {soi.map((item) => {
                const href = toPublicUrl(item.url);
                const isImage = /\.(jpe?g|png|gif|webp)$/i.test(item.url) || item.url.includes('/image');
                const isVideo = /\.(mp4|webm|ogg)$/i.test(item.url) || item.url.includes('/video');
                return (
                  <li key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    {isImage ? (
                      <img
                        src={href}
                        alt=""
                        className="w-full rounded-lg object-contain max-h-48"
                        loading="lazy"
                      />
                    ) : isVideo ? (
                      <video
                        src={href}
                        controls
                        className="w-full rounded-lg max-h-48"
                        preload="metadata"
                      />
                    ) : (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm text-primary hover:underline"
                      >
                        {item.url}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
