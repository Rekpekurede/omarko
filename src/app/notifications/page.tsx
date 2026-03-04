import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsList } from '@/components/NotificationsList';
import { PageContainer } from '@/components/PageContainer';

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
    .select('id, type, mark_id, actor_id, read_at, created_at, profiles!notifications_actor_id_fkey(username)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  const notifications = (list ?? []).map((row) => {
    const actorProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const { profiles, ...rest } = row;
    void profiles;
    return {
      ...rest,
      actor_username: actorProfile?.username ?? null,
    };
  });
  const nextCursor = notifications.length === LIMIT && notifications[notifications.length - 1]
    ? notifications[notifications.length - 1].id
    : null;

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-2xl font-semibold">Alerts</h1>
      <NotificationsList
        initialNotifications={notifications}
        initialNextCursor={nextCursor}
        initialUnreadCount={unreadCount ?? 0}
      />
    </PageContainer>
  );
}
