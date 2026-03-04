import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Suggestion name is required' }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: 'Suggestion is too long' }, { status: 400 });
  }

  const { error } = await supabase
    .from('claim_type_suggestions')
    .insert({ name, user_id: user.id, status: 'pending' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
