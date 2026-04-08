import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const uname = decodeURIComponent(username);
  const { data: profileRows } = await supabase.rpc('get_profile_by_username', { p_username: uname });
  const profile = profileRows?.[0] ?? null;
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  let following = false;
  if (user) {
    const { data: row } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    following = !!row;
  }

  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ]);

  return NextResponse.json({
    following,
    followersCount: followersRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
  });
}
