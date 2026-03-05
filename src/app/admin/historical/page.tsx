import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminHistoricalClient } from './AdminHistoricalClient';
import { DOMAINS } from '@/lib/types';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function AdminHistoricalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single();

  if (profile?.profile_type !== 'admin') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-red-600">Access denied</h1>
        <p className="mt-2 text-sm text-gray-600">Only admins can access this page.</p>
      </div>
    );
  }

  const { data: historicalProfiles } = await supabase
    .from('historical_profiles')
    .select('id, name, era, domain, created_at')
    .order('name', { ascending: true });

  const profileIds = (historicalProfiles ?? []).map((p) => p.id);
  const markCounts: Record<string, number> = {};
  if (profileIds.length > 0) {
    const { data: countRows } = await supabase
      .from('marks')
      .select('historical_profile_id')
      .not('historical_profile_id', 'is', null)
      .in('historical_profile_id', profileIds);
    for (const row of countRows ?? []) {
      const id = row.historical_profile_id as string;
      markCounts[id] = (markCounts[id] ?? 0) + 1;
    }
  }

  const { data: claimTypes } = await supabase
    .from('claim_types')
    .select('id, name')
    .order('name', { ascending: true });

  const profilesWithCount = (historicalProfiles ?? []).map((p) => ({
    ...p,
    marks_count: markCounts[p.id] ?? 0,
  }));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Historical profiles</h1>
      <AdminHistoricalClient
        profiles={profilesWithCount}
        claimTypes={claimTypes ?? []}
        domains={[...DOMAINS]}
      />
    </div>
  );
}
