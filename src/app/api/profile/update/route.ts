import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BIO_MAX = 240;
const WEBSITE_REGEX = /^https?:\/\/[^\s]+$/i;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { display_name?: string; bio?: string; location?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.display_name !== undefined) {
    updates.display_name = body.display_name?.trim() || null;
  }
  if (body.bio !== undefined) {
    const bio = body.bio?.trim() || null;
    if (bio && bio.length > BIO_MAX) {
      return NextResponse.json({ error: `Bio must be ${BIO_MAX} characters or less` }, { status: 400 });
    }
    updates.bio = bio;
  }
  if (body.location !== undefined) {
    updates.location = body.location?.trim() || null;
  }
  if (body.website !== undefined) {
    let website = body.website?.trim() || null;
    if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      website = `https://${website}`;
    }
    if (website && !WEBSITE_REGEX.test(website)) {
      return NextResponse.json({ error: 'Website must be a valid URL' }, { status: 400 });
    }
    updates.website = website;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const username =
    existingProfile?.username ??
    ((user.user_metadata as { username?: string } | undefined)?.username ?? `user_${user.id.slice(0, 8)}`);

  const payload = {
    id: user.id,
    username,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, username, bio, avatar_url')
    .single();

  console.log('[ProfileUpdate] upsert response', {
    userId: user.id,
    payloadKeys: Object.keys(payload),
    data,
    error,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}
