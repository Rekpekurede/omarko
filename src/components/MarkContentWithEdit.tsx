'use client';

import { useState } from 'react';
import { EditMarkForm } from './EditMarkForm';

interface MarkContentWithEditProps {
  content: string;
  imageUrl?: string | null;
  media?: Array<{
    id: string;
    kind: 'image' | 'audio' | 'video';
    signed_url?: string | null;
    poster_signed_url?: string | null;
  }>;
  markId: string;
  canEdit: boolean;
  initialEdit?: boolean;
  /** When set, the inline Edit control is omitted (e.g. detail page shows Edit in the footer row). */
  hideInlineEditButton?: boolean;
}

export function MarkContentWithEdit({
  content,
  imageUrl,
  media = [],
  markId,
  canEdit,
  initialEdit = false,
  hideInlineEditButton = false,
}: MarkContentWithEditProps) {
  const [editing, setEditing] = useState(initialEdit);
  const firstMedia = media[0] ?? null;
  const effectiveImageUrl = firstMedia?.kind === 'image' ? firstMedia.signed_url : imageUrl;

  if (editing && canEdit) {
    return (
      <div>
        <EditMarkForm
          markId={markId}
          currentContent={content}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {effectiveImageUrl && (
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={effectiveImageUrl} alt="" className="max-h-[80vh] w-full object-contain" loading="lazy" />
        </div>
      )}
      {firstMedia?.kind === 'audio' && firstMedia.signed_url && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <audio controls className="w-full" preload="metadata">
            <source src={firstMedia.signed_url} />
          </audio>
        </div>
      )}
      {firstMedia?.kind === 'video' && firstMedia.signed_url && (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/40 p-2">
          <video controls preload="metadata" poster={firstMedia.poster_signed_url ?? undefined} className="max-h-[80vh] w-full rounded-lg">
            <source src={firstMedia.signed_url} />
          </video>
        </div>
      )}
      {content && <p className="mark-text min-w-0 text-base leading-relaxed">{content}</p>}
      {canEdit && !hideInlineEditButton && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-muted-foreground hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
