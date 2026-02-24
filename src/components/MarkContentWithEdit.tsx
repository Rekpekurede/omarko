'use client';

import { useState } from 'react';
import { EditMarkForm } from './EditMarkForm';

interface MarkContentWithEditProps {
  content: string;
  markId: string;
  canEdit: boolean;
}

export function MarkContentWithEdit({ content, markId, canEdit }: MarkContentWithEditProps) {
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
      <p className="mt-3 text-gray-600">{content}</p>
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
