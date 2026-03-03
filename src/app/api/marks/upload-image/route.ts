import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MARK_IMAGES_BUCKET, markImagePath, markImagePublicUrl } from '@/lib/storage';
import { randomUUID } from 'crypto';

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

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowedExt.includes(ext)) {
    return NextResponse.json({ error: 'Image type not allowed' }, { status: 400 });
  }

  const filename = `${randomUUID()}.${ext}`;
  const path = markImagePath(user.id, filename);

  const { error } = await supabase.storage
    .from(MARK_IMAGES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    if (error.message.toLowerCase().includes('bucket') && error.message.toLowerCase().includes('not found')) {
      return NextResponse.json(
        { error: `Storage bucket "${MARK_IMAGES_BUCKET}" not found. Create it in Supabase Storage and allow authenticated uploads.` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = markImagePublicUrl(path);
  return NextResponse.json({ image_url: publicUrl });
}
