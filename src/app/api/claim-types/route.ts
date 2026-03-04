import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ClaimTypeRow = {
  id: string;
  name: string;
  description: string | null;
  family: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  let query = supabase
    .from('claim_types')
    .select('id, name, description, family')
    .order('name', { ascending: true })
    .limit(200);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: results, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resultList = results ?? [];
  const usage = new Map<string, number>();
  const nameToId = new Map(resultList.map((r) => [r.name.toLowerCase(), r.id]));

  const recentById = await supabase
    .from('marks')
    .select('claim_type_id')
    .not('claim_type_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (!recentById.error) {
    for (const row of recentById.data ?? []) {
      const id = row.claim_type_id as string | null;
      if (!id) continue;
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  } else {
    const recentByName = await supabase
      .from('marks')
      .select('claim_type')
      .not('claim_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000);
    for (const row of recentByName.data ?? []) {
      const name = (row.claim_type as string | null)?.trim().toLowerCase();
      if (!name) continue;
      const id = nameToId.get(name);
      if (!id) continue;
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  }

  const mostUsedIds = Array.from(usage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  let mostUsed: ClaimTypeRow[] = [];
  if (mostUsedIds.length > 0) {
    const { data: topRows } = await supabase
      .from('claim_types')
      .select('id, name, description, family')
      .in('id', mostUsedIds);
    const orderMap = new Map(mostUsedIds.map((id, idx) => [id, idx]));
    mostUsed = (topRows ?? []).sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  }

  return NextResponse.json({
    results: resultList,
    mostUsed,
  });
}
