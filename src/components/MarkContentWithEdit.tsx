'use client';

import { useState } from 'react';
import { EditMarkForm } from './EditMarkForm';

interface MarkContentWithEditProps {
  content: string;
  imageUrl?: string | null;
  markId: string;
  canEdit: boolean;
}

export function MarkContentWithEdit({ content, imageUrl, markId, canEdit }: MarkContentWithEditProps) {
  const [editing, setEditing] = useState(false);

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
    <div>
      {imageUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="max-h-[80vh] w-full object-contain" />
        </div>
      )}
      {content && <p className="mt-3 text-base leading-relaxed text-foreground">{content}</p>}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-sm text-muted-foreground hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
