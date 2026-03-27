import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminReportsClient } from './AdminReportsClient';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single();

  if (profile?.profile_type !== 'admin') {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold text-red-600">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">Only admins can access reports.</p>
      </div>
    );
  }

  const { data: reports } = await supabase
    .from('reports')
    .select('id, mark_id, reporter_id, reason, status, created_at, reviewed_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const markIds = Array.from(new Set((reports ?? []).map((r) => r.mark_id)));
  const reporterIds = Array.from(new Set((reports ?? []).map((r) => r.reporter_id)));

  const [{ data: marks }, { data: reporters }] = await Promise.all([
    markIds.length
      ? supabase.from('marks').select('id, user_id, content, moderation_status').in('id', markIds)
      : Promise.resolve({ data: [] as Array<{ id: string; user_id: string; content: string | null; moderation_status?: string | null }> }),
    reporterIds.length
      ? supabase.from('profiles').select('id, username').in('id', reporterIds)
      : Promise.resolve({ data: [] as Array<{ id: string; username: string }> }),
  ]);

  const ownerIds = Array.from(new Set((marks ?? []).map((m) => m.user_id)));
  const { data: owners } = ownerIds.length
    ? await supabase.from('profiles').select('id, username').in('id', ownerIds)
    : { data: [] as Array<{ id: string; username: string }> };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Reports moderation queue</h1>
      <AdminReportsClient reports={reports ?? []} marks={marks ?? []} reporters={reporters ?? []} owners={owners ?? []} />
    </div>
  );
}

