/** Supabase Storage helpers — single bucket for all mark attachments (image/audio/video). */

export const AVATARS_BUCKET = 'avatars';

/** Bucket used for mark attachments. Path format: {user_id}/{filename} or {user_id}/{mark_id}/{filename}. */
export const MARK_MEDIA_BUCKET = 'mark-media';

/** @deprecated Use MARK_MEDIA_BUCKET. Kept for compatibility. */
export const MARK_IMAGES_BUCKET = MARK_MEDIA_BUCKET;

/** Avatar path for a user: {user_id}.png */
export function avatarPath(userId: string): string {
  return `${userId}.png`;
}

/** Mark attachment path without mark_id (upload-first flow): {user_id}/{filename}. No leading slash. */
export function markImagePath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

/** Mark attachment path with mark_id: {user_id}/{mark_id}/{filename}. No leading slash. */
export function markMediaPath(userId: string, markId: string, filename: string): string {
  return `${userId}/${markId}/${filename}`;
}

/** Public URL for storage object */
export function storagePublicUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** Public URL for an avatar (when bucket is public) */
export function avatarPublicUrl(path: string): string {
  return storagePublicUrl(AVATARS_BUCKET, path);
}

/** Public URL for a mark attachment (requires bucket to allow public read). */
export function markImagePublicUrl(path: string): string {
  return storagePublicUrl(MARK_MEDIA_BUCKET, path);
}
