import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id, title, content')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can edit' }, { status: 403 });
  }

  const { count } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('mark_id', markId);

  let body: { content?: string; claim_type?: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const hasContentUpdate = typeof body.content === 'string';
  const hasClaimTypeUpdate = typeof body.claim_type === 'string';
  const hasDomainUpdate = typeof body.domain === 'string';

  if (!hasContentUpdate && !hasClaimTypeUpdate && !hasDomainUpdate) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (hasContentUpdate) {
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Mark is locked: cannot edit after a challenge exists' },
        { status: 403 }
      );
    }
    await supabase.from('mark_versions').insert({
      mark_id: markId,
      title: mark.title ?? '',
      content: mark.content,
    });
    updates.content = content;
  }

  if (hasClaimTypeUpdate) {
    const claimType = body.claim_type?.trim();
    if (!claimType) {
      return NextResponse.json({ error: 'Claim type is required' }, { status: 400 });
    }
    updates.claim_type = claimType;
  }

  if (hasDomainUpdate) {
    const domain = body.domain?.trim();
    if (!domain || !(DOMAINS as readonly string[]).includes(domain)) {
      return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }
    updates.domain = domain;
  }

  const { data: updated, error } = await supabase
    .from('marks')
    .update(updates)
    .eq('id', markId)
    .eq('user_id', user.id)
    .select('id, user_id, content, category, domain, claim_type, status, support_votes, oppose_votes, dispute_count, disputes_survived, withdrawn_at, withdrawn_by, owner_response, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: markId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: mark } = await supabase
    .from('marks')
    .select('id, user_id')
    .eq('id', markId)
    .single();

  if (!mark) {
    return NextResponse.json({ error: 'Mark not found' }, { status: 404 });
  }
  if (mark.user_id !== user.id) {
    return NextResponse.json({ error: 'Only the mark owner can delete this post' }, { status: 403 });
  }

  const { error } = await supabase.from('marks').delete().eq('id', markId).eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
