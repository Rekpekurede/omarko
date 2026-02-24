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
        <div className="mt-3 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="max-h-96 w-full object-contain" />
        </div>
      )}
      {content && <p className="mt-3 text-gray-600 dark:text-gray-300">{content}</p>}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-sm text-gray-500 hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
