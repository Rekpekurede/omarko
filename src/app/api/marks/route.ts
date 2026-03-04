import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { content?: string | null; image_url?: string | null; media_url?: string | null; image_path?: string | null; category?: string; domain?: string; claim_type?: string; claim_type_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  const imageUrl = body.image_url?.trim() || body.media_url?.trim() || null;
  const imagePath = body.image_path?.trim() || null;
  const domain = body.domain?.trim();
  const claimTypeId = body.claim_type_id?.trim();
  const claimTypeName = body.claim_type?.trim();

  if (!content && !imageUrl) {
    return NextResponse.json(
      { error: 'At least one of content or image is required' },
      { status: 400 }
    );
  }
  if (!domain || !(DOMAINS as readonly string[]).includes(domain)) {
    return NextResponse.json(
      { error: 'Valid domain is required' },
      { status: 400 }
    );
  }
  if (!claimTypeId && !claimTypeName) {
    return NextResponse.json({ error: 'claim_type_id is required' }, { status: 400 });
  }

  let claimTypeRow: { id: string; name: string } | null = null;
  if (claimTypeId) {
    const { data } = await supabase
      .from('claim_types')
      .select('id, name')
      .eq('id', claimTypeId)
      .maybeSingle();
    claimTypeRow = data;
  } else if (claimTypeName) {
    const { data } = await supabase
      .from('claim_types')
      .select('id, name')
      .eq('name', claimTypeName)
      .maybeSingle();
    claimTypeRow = data;
  }

  if (!claimTypeRow) {
    return NextResponse.json({ error: 'Valid claim type is required' }, { status: 400 });
  }
  const category = body.category?.trim() || 'General';

  const payload: Record<string, unknown> = {
    user_id: user.id,
    title: '',
    content: content || '',
    category,
    domain,
    claim_type: claimTypeRow.name,
    claim_type_id: claimTypeRow.id,
    image_url: imageUrl,
    image_path: imagePath,
  };

  let data: { id: string } | null = null;
  let error: { message: string } | null = null;
  const insertPayload = { ...payload };

  let attempt = await supabase.from('marks').insert(insertPayload).select('id').single();
  data = attempt.data;
  error = attempt.error as { message: string } | null;

  if (error?.message?.includes('claim_type_id')) {
    delete insertPayload.claim_type_id;
    attempt = await supabase.from('marks').insert(insertPayload).select('id').single();
    data = attempt.data;
    error = attempt.error as { message: string } | null;
  }

  if (error?.message?.includes('image_path')) {
    delete insertPayload.image_path;
    attempt = await supabase.from('marks').insert(insertPayload).select('id').single();
    data = attempt.data;
    error = attempt.error as { message: string } | null;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Failed to create mark' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
