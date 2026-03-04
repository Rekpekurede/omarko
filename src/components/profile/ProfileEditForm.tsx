'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BIO_MAX = 240;

interface ProfileEditFormProps {
  initial: {
    display_name: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
  };
  onCancel: () => void;
  onSaved?: (next: { display_name: string | null; bio: string | null; location: string | null; website: string | null }) => void;
}

export function ProfileEditForm({ initial, onCancel, onSaved }: ProfileEditFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const res = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to save');
      return;
    }
    onSaved?.({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
    });
    setSuccess(true);
    router.refresh();
    setTimeout(() => {
      onCancel();
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Display name
        </label>
        <input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          placeholder="Short bio"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <p className="mt-0.5 text-xs text-gray-500">{bio.length}/{BIO_MAX}</p>
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Location
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Optional"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Website
        </label>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Saved.</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
