import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** POST: create historical profile (admin only) */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type')
    .eq('id', user.id)
    .single();

  if (profile?.profile_type !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { name?: string; bio?: string; era?: string; domain?: string; avatar_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('historical_profiles')
    .insert({
      name,
      bio: body.bio?.trim() || null,
      era: body.era?.trim() || null,
      domain: body.domain?.trim() || null,
      avatar_url: body.avatar_url?.trim() || null,
      created_by: user.id,
    })
    .select('id, name, era, domain, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(inserted);
}
