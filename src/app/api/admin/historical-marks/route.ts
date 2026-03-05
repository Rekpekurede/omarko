import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';

/** POST: add a mark to a historical figure (admin or custodian only) */
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

  const isAdmin = profile?.profile_type === 'admin';
  let body: { historical_profile_id?: string; content?: string; domain?: string; claim_type?: string; claim_type_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const historicalProfileId = body.historical_profile_id?.trim();
  if (!historicalProfileId) {
    return NextResponse.json({ error: 'historical_profile_id is required' }, { status: 400 });
  }

  if (!isAdmin) {
    const { data: custodian } = await supabase
      .from('historical_custodians')
      .select('id')
      .eq('historical_profile_id', historicalProfileId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!custodian) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const content = body.content?.trim() ?? '';
  const domain = body.domain?.trim();
  if (!domain || !(DOMAINS as readonly string[]).includes(domain)) {
    return NextResponse.json({ error: 'Valid domain is required' }, { status: 400 });
  }

  const claimTypeName = body.claim_type?.trim();
  const claimTypeId = body.claim_type_id?.trim();
  if (!claimTypeId && !claimTypeName) {
    return NextResponse.json({ error: 'claim_type or claim_type_id is required' }, { status: 400 });
  }

  let claimTypeRow: { id: string; name: string } | null = null;
  const hasUuid = !!claimTypeId && /^[0-9a-f-]{36}$/i.test(claimTypeId);
  if (hasUuid && claimTypeId) {
    const { data } = await supabase
      .from('claim_types')
      .select('id, name')
      .eq('id', claimTypeId)
      .maybeSingle();
    claimTypeRow = data;
  }
  if (!claimTypeRow && claimTypeName) {
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

  const payload: Record<string, unknown> = {
    user_id: user.id,
    historical_profile_id: historicalProfileId,
    title: '',
    content: content || '',
    category: 'General',
    domain,
    claim_type: claimTypeRow.name,
    claim_type_id: claimTypeRow.id,
  };

  const { data: inserted, error } = await supabase
    .from('marks')
    .insert(payload)
    .select('id, content, domain, claim_type, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(inserted);
}
