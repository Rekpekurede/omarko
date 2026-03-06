import type { SupabaseClient } from '@supabase/supabase-js';
import { MARK_MEDIA_BUCKET } from './storage';

export type MarkMediaRow = {
  id: string;
  mark_id: string;
  owner_id: string;
  kind: 'image' | 'audio' | 'video';
  mime_type: string;
  path: string;
  size_bytes: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  poster_path: string | null;
  created_at: string;
};

export type MarkMediaWithUrl = MarkMediaRow & {
  signed_url: string | null;
  poster_signed_url: string | null;
};

const TTL_SECONDS = 60 * 10;

export async function getSignedMediaForMarkIds(
  supabase: SupabaseClient,
  markIds: string[]
): Promise<Record<string, MarkMediaWithUrl[]>> {
  if (markIds.length === 0) return {};

  const { data, error } = await supabase
    .from('mark_media')
    .select('id, mark_id, owner_id, kind, mime_type, path, size_bytes, duration_ms, width, height, poster_path, created_at')
    .in('mark_id', markIds)
    .order('created_at', { ascending: true });

  if (error) {
    return {};
  }

  const rows = (data ?? []) as MarkMediaRow[];
  const uniquePaths = Array.from(new Set(rows.map((r) => r.path)));
  const uniquePosterPaths = Array.from(new Set(rows.map((r) => r.poster_path).filter((v): v is string => !!v)));

  const [fileSignedRes, posterSignedRes] = await Promise.all([
    uniquePaths.length > 0
      ? supabase.storage.from(MARK_MEDIA_BUCKET).createSignedUrls(uniquePaths, TTL_SECONDS)
      : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
    uniquePosterPaths.length > 0
      ? supabase.storage.from(MARK_MEDIA_BUCKET).createSignedUrls(uniquePosterPaths, TTL_SECONDS)
      : Promise.resolve({ data: [] as { path: string; signedUrl: string }[] }),
  ]);

  const fileMap = new Map((fileSignedRes.data ?? []).map((x) => [x.path, x.signedUrl]));
  const posterMap = new Map((posterSignedRes.data ?? []).map((x) => [x.path, x.signedUrl]));

  const grouped: Record<string, MarkMediaWithUrl[]> = {};
  for (const row of rows) {
    const withUrl: MarkMediaWithUrl = {
      ...row,
      signed_url: fileMap.get(row.path) ?? null,
      poster_signed_url: row.poster_path ? (posterMap.get(row.poster_path) ?? null) : null,
    };
    if (!grouped[row.mark_id]) grouped[row.mark_id] = [];
    grouped[row.mark_id].push(withUrl);
  }

  return grouped;
}
