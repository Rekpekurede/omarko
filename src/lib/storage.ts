/** Supabase Storage helpers */

export const AVATARS_BUCKET = 'avatars';
export const MARK_IMAGES_BUCKET = 'mark-images';

/** Avatar path for a user: {user_id}.png */
export function avatarPath(userId: string): string {
  return `${userId}.png`;
}

/** Mark image path: {user_id}/{uuid}.{ext} */
export function markImagePath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
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

/** Public URL for a mark image */
export function markImagePublicUrl(path: string): string {
  return storagePublicUrl(MARK_IMAGES_BUCKET, path);
}
