import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsList } from '@/components/NotificationsList';

export const revalidate = 0;

const LIMIT = 20;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: list } = await supabase
    .from('notifications')
    .select('id, type, mark_id, actor_id, message, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  const notifications = list ?? [];
  const nextCursor = notifications.length === LIMIT && notifications[notifications.length - 1]
    ? notifications[notifications.length - 1].id
    : null;

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Notifications</h1>
      <NotificationsList
        initialNotifications={notifications}
        initialNextCursor={nextCursor}
        initialUnreadCount={unreadCount ?? 0}
      />
    </div>
  );
}
