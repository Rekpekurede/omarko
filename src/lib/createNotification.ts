import { createClient } from '@/lib/supabase/server';

export type NotificationType = 'follow' | 'support' | 'oppose' | 'challenge' | 'comment' | 'soi';

export interface CreateNotificationParams {
  userId: string;
  actorId: string;
  type: NotificationType;
  markId?: string | null;
  commentId?: string | null;
}

/**
 * Create a notification. Never throws; failures are silent so the main action is never broken.
 * - No self-notifications (userId === actorId).
 * - Duplicate inserts (e.g. same user/actor/type/mark) are ignored.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, actorId, type, markId, commentId } = params;

  if (userId === actorId) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      actor_id: actorId,
      type,
      mark_id: markId ?? null,
      comment_id: commentId ?? null,
    });

    if (error) {
      if (error.code === '23505') return; // unique violation → treat as dedup, ignore
      return; // silent failure
    }
  } catch {
    // notification failure must never break the main action
  }
}
