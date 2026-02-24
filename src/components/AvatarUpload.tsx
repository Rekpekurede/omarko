'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';

interface AvatarUploadProps {
  username: string;
  avatarUrl?: string | null;
}

export function AvatarUpload({ username, avatarUrl }: AvatarUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(avatarUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok && data.avatar_url) {
      setCurrentUrl(data.avatar_url);
      router.refresh();
    } else {
      setError(data.error ?? 'Upload failed');
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar username={username} avatarUrl={currentUrl} size="lg" />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload avatar'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
