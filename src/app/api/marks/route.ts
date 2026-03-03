import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const DOMAINS = ['Music', 'Dance', 'Literature', 'VisualArt', 'Architecture', 'Politics', 'Business', 'Technology', 'Science', 'Sport', 'Law', 'Culture', 'General'];
  const CLAIM_TYPES = ['Creation', 'Prediction', 'Implementation', 'Discovery', 'Innovation', 'Strategy', 'Record', 'Invite'];

  let body: { content?: string | null; image_url?: string | null; media_url?: string | null; image_path?: string | null; category?: string; domain?: string; claim_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  const imageUrl = body.image_url?.trim() || body.media_url?.trim() || body.image_path?.trim() || null;
  const domain = body.domain?.trim();
  const claimType = body.claim_type?.trim();

  if (!content && !imageUrl) {
    return NextResponse.json(
      { error: 'At least one of content or image is required' },
      { status: 400 }
    );
  }
  if (!domain || !DOMAINS.includes(domain)) {
    return NextResponse.json(
      { error: 'Valid domain is required' },
      { status: 400 }
    );
  }
  if (!claimType || !CLAIM_TYPES.includes(claimType)) {
    return NextResponse.json(
      { error: 'Valid claim_type is required' },
      { status: 400 }
    );
  }
  const category = body.category?.trim() || 'General';

  const { data, error } = await supabase
    .from('marks')
    .insert({ user_id: user.id, title: '', content: content || '', category, domain, claim_type: claimType, image_url: imageUrl })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
