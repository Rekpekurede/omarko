'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProfileRow {
  id: string;
  name: string;
  era: string | null;
  domain: string | null;
  created_at: string;
  marks_count: number;
}

interface AdminHistoricalClientProps {
  profiles: ProfileRow[];
  claimTypes: { id: string; name: string }[];
  domains: string[];
}

export function AdminHistoricalClient({
  profiles: initialProfiles,
  claimTypes,
  domains,
}: AdminHistoricalClientProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);

  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newEra, setNewEra] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '');
  const [markContent, setMarkContent] = useState('');
  const [markDomain, setMarkDomain] = useState(domains[0] ?? 'General');
  const [markClaimTypeId, setMarkClaimTypeId] = useState(claimTypes[0]?.id ?? '');
  const [markSubmitting, setMarkSubmitting] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [markSuccess, setMarkSuccess] = useState(false);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || createSubmitting) return;
    setCreateError(null);
    setCreateSubmitting(true);
    const res = await fetch('/api/admin/historical-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        bio: newBio.trim() || undefined,
        era: newEra.trim() || undefined,
        domain: newDomain.trim() || undefined,
        avatar_url: newAvatarUrl.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreateSubmitting(false);
    if (!res.ok) {
      setCreateError(data.error ?? 'Failed to create');
      return;
    }
    setProfiles((prev) => [...prev, { ...data, marks_count: 0 }]);
    setNewName('');
    setNewBio('');
    setNewEra('');
    setNewDomain('');
    setNewAvatarUrl('');
    setSelectedProfileId(data.id);
    router.refresh();
  };

  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || (!markContent.trim() && !markClaimTypeId) || markSubmitting) return;
    setMarkError(null);
    setMarkSuccess(false);
    setMarkSubmitting(true);
    const claimType = claimTypes.find((c) => c.id === markClaimTypeId);
    const res = await fetch('/api/admin/historical-marks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        historical_profile_id: selectedProfileId,
        content: markContent.trim(),
        domain: markDomain,
        claim_type_id: markClaimTypeId,
        claim_type: claimType?.name,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setMarkSubmitting(false);
    if (!res.ok) {
      setMarkError(data.error ?? 'Failed to add mark');
      return;
    }
    setMarkSuccess(true);
    setMarkContent('');
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === selectedProfileId ? { ...p, marks_count: p.marks_count + 1 } : p
      )
    );
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Create historical profile</h2>
        <form onSubmit={handleCreateProfile} className="flex flex-col gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (required)"
            required
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <input
            type="text"
            value={newEra}
            onChange={(e) => setNewEra(e.target.value)}
            placeholder="Era (e.g. 1879–1955)"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="Domain (e.g. Science)"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <textarea
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            placeholder="Bio"
            rows={2}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <input
            type="url"
            value={newAvatarUrl}
            onChange={(e) => setNewAvatarUrl(e.target.value)}
            placeholder="Avatar URL"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={createSubmitting || !newName.trim()}
            className="min-h-[44px] rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {createSubmitting ? 'Creating…' : 'Create profile'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Add mark to figure</h2>
        <form onSubmit={handleAddMark} className="flex flex-col gap-3">
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="min-h-[44px] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            aria-label="Select historical figure"
          >
            <option value="">Select figure</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.marks_count} marks)
              </option>
            ))}
          </select>
          <input
            type="text"
            value={markContent}
            onChange={(e) => setMarkContent(e.target.value)}
            placeholder="Content (required)"
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={markDomain}
              onChange={(e) => setMarkDomain(e.target.value)}
              className="min-h-[44px] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              aria-label="Domain"
            >
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={markClaimTypeId}
              onChange={(e) => setMarkClaimTypeId(e.target.value)}
              className="min-h-[44px] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              aria-label="Claim type"
            >
              {claimTypes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {markError && <p className="text-sm text-red-600">{markError}</p>}
          {markSuccess && <p className="text-sm text-green-600">Mark added.</p>}
          <button
            type="submit"
            disabled={markSubmitting || !selectedProfileId || !markContent.trim()}
            className="min-h-[44px] rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {markSubmitting ? 'Adding…' : 'Add mark'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold text-foreground">All historical profiles</h2>
        <ul className="space-y-2">
          {profiles.length === 0 ? (
            <li className="text-sm text-muted-foreground">None yet. Create one above.</li>
          ) : (
            profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/historical/profile/${p.id}`} className="font-medium text-foreground hover:underline">
                  {p.name}
                </Link>
                <span className="text-muted-foreground">{p.marks_count} marks</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
