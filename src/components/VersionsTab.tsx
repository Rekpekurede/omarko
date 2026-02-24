'use client';

import { useEffect, useState } from 'react';

interface Version {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function VersionsTab({ markId }: { markId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/marks/${markId}/versions`)
      .then((res) => res.json())
      .then((data) => setVersions(data.versions ?? []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [markId]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (versions.length === 0) return <p className="text-sm text-gray-500">No version history.</p>;

  return (
    <ul className="space-y-4">
      {versions.map((v) => (
        <li key={v.id} className="border-l-2 border-gray-200 pl-3 text-sm">
          <p className="text-gray-500">{new Date(v.created_at).toLocaleString()}</p>
          <p className="mt-1 text-gray-800 whitespace-pre-wrap">{v.content}</p>
        </li>
      ))}
    </ul>
  );
}
