/** Supabase Storage helper for avatars */

export const AVATARS_BUCKET = 'avatars';

/** Avatar path for a user: {user_id}.png */
export function avatarPath(userId: string): string {
  return `${userId}.png`;
}

/** Public URL for an avatar (when bucket is public) */
export function avatarPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${path}`;
}
