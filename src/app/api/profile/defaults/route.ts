import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DOMAINS } from '@/lib/types';

type DefaultsPayload = {
  defaultDomain?: string | null;
  defaultClaimType?: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let profile: { default_domain?: string | null; default_claim_type?: string | null } | null = null;
  const profileRes = await supabase
    .from('profiles')
    .select('default_domain, default_claim_type')
    .eq('id', user.id)
    .maybeSingle();
  if (!profileRes.error) {
    profile = profileRes.data;
  }
  // If schema cache or column missing (e.g. default_claim_type), profile may be null; return safe defaults
  const defaultClaimType = profile?.default_claim_type ?? null;
  let claimTypeOption: { id: string; name: string } | null = null;
  if (defaultClaimType) {
    const { data, error } = await supabase
      .from('claim_types')
      .select('id, name')
      .eq('name', defaultClaimType)
      .maybeSingle();
    claimTypeOption = data ?? { id: defaultClaimType, name: defaultClaimType };
    if (error) {
      claimTypeOption = { id: defaultClaimType, name: defaultClaimType };
    }
  }

  return NextResponse.json({
    defaultDomain: profile?.default_domain ?? null,
    defaultClaimType: defaultClaimType,
    defaultClaimTypeOption: claimTypeOption,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: DefaultsPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const defaultDomain = body.defaultDomain?.trim() || null;
  const defaultClaimType = body.defaultClaimType?.trim() || null;

  if (defaultDomain && !(DOMAINS as readonly string[]).includes(defaultDomain)) {
    return NextResponse.json({ error: 'Invalid default domain' }, { status: 400 });
  }

  if (defaultClaimType?.toLowerCase() === 'statement') {
    return NextResponse.json({ error: 'Statement is not a supported claim type' }, { status: 400 });
  }

  if (defaultClaimType) {
    const { data: claimType, error: claimTypeErr } = await supabase
      .from('claim_types')
      .select('id')
      .eq('name', defaultClaimType)
      .maybeSingle();
    if (!claimTypeErr && !claimType) {
      return NextResponse.json({ error: 'Invalid default claim type' }, { status: 400 });
    }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();

  const username =
    existingProfile?.username ??
    ((user.user_metadata as { username?: string } | undefined)?.username ?? `user_${user.id.slice(0, 8)}`);

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username,
        default_domain: defaultDomain,
        default_claim_type: defaultClaimType,
      },
      { onConflict: 'id' }
    )
    .select('default_domain, default_claim_type')
    .single();

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('default_claim_type') || msg.includes('default_domain') || msg.includes('column')) {
      return NextResponse.json({
        error: 'Posting defaults are not available yet. Please try again later.',
      }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    defaultDomain: data?.default_domain ?? null,
    defaultClaimType: data?.default_claim_type ?? null,
  });
}
