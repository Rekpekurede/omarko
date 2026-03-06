import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CLAIM_TYPES, CLAIM_TYPE_DESCRIPTIONS } from '@/lib/types';

type ClaimTypeRow = {
  id: string;
  name: string;
  description: string | null;
};

const FALLBACK_CLAIM_TYPES: ClaimTypeRow[] = CLAIM_TYPES.map((name) => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  description: CLAIM_TYPE_DESCRIPTIONS[name] ?? null,
}));

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();

  const query = supabase
    .from('claim_types')
    .select('id, name, description')
    .order('name', { ascending: true })
    .limit(200);

  const { data: results, error } = await query;
  if (error) {
    // Graceful fallback while migrations/schema cache catch up.
    const filtered = q
      ? FALLBACK_CLAIM_TYPES.filter((x) => x.name.toLowerCase().includes(q))
      : FALLBACK_CLAIM_TYPES;
    return NextResponse.json({
      results: filtered,
      mostUsed: FALLBACK_CLAIM_TYPES.slice(0, 10),
      warning: 'claim_types table not available yet. Showing starter claim types.',
    });
  }

  const canonicalSet = new Set(CLAIM_TYPES);
  const resultList = ((results ?? []) as ClaimTypeRow[]).filter((x) => canonicalSet.has(x.name as (typeof CLAIM_TYPES)[number]));
  const filtered = q
    ? resultList.filter((x) => x.name.toLowerCase().includes(q))
    : resultList;
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
      .select('id, name, description')
      .in('id', mostUsedIds);
    const orderMap = new Map(mostUsedIds.map((id, idx) => [id, idx]));
    mostUsed = ((topRows ?? []) as ClaimTypeRow[]).sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  }

  return NextResponse.json({
    results: filtered,
    mostUsed,
  });
}
