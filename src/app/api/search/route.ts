import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MARK_WITH_OWNER_USERNAME_SELECT } from '@/lib/dbSelects';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ profiles: [], marks: [] });
  }

  const term = `%${q}%`;

  const [profilesRes, marksRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', term)
      .limit(10),
    supabase
      .from('marks')
      .select(MARK_WITH_OWNER_USERNAME_SELECT)
      .is('withdrawn_at', null)
      .ilike('content', term)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    marks: marksRes.data ?? [],
  });
}
