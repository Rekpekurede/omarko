import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreateMarkForm } from '@/components/CreateMarkForm';

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  const username = profile?.username ?? '';

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Your Mark</h1>
      <CreateMarkForm username={username} />
    </div>
  );
}
