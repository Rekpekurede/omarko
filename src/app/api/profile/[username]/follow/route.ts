import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/createNotification';

async function getCounts(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
  ]);
  return {
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uname = decodeURIComponent(username);
  const { data: profileRows } = await supabase.rpc('get_profile_by_username', { p_username: uname });
  const profile = profileRows?.[0] ?? null;
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.id === user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: profile.id,
  });

  if (error) {
    if (error.code === '23505') {
      const counts = await getCounts(supabase, profile.id);
      return NextResponse.json({ ok: true, following: true, ...counts });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await createNotification({
      userId: profile.id,
      actorId: user.id,
      type: 'follow',
    });
  } catch {
    /* notification failure must not break the main action */
  }

  const counts = await getCounts(supabase, profile.id);
  return NextResponse.json({ ok: true, following: true, ...counts });
}
