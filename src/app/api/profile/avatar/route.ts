import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { avatarPath, avatarPublicUrl } from '@/lib/storage';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid or missing image file' }, { status: 400 });
  }

  const path = avatarPath(user.id);
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const publicUrl = avatarPublicUrl(path);
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const username =
    existingProfile?.username ??
    ((user.user_metadata as { username?: string } | undefined)?.username ?? `user_${user.id.slice(0, 8)}`);

  const { data: upserted, error: updateError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('id, username, avatar_url')
    .single();

  console.log('[ProfileAvatar] upsert response', {
    userId: user.id,
    avatarPath: path,
    avatarUrl: publicUrl,
    data: upserted,
    error: updateError,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: publicUrl });
}
