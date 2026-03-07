import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationsList } from '@/components/NotificationsList';
import { PageContainer } from '@/components/PageContainer';

export const revalidate = 0;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <NotificationsList />
    </PageContainer>
  );
}
