/**
 * Seed historical profiles and their marks.
 * Run from web/: npx ts-node scripts/seed-historical.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or anon key if first user is admin).
 * Optional: load .env.local with dotenv or export vars before running.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface HistoricalFigure {
  name: string;
  bio: string;
  era: string;
  domain: string;
  marks: { title: string; claimType: string; domain: string }[];
}

const FIGURES: HistoricalFigure[] = [
  {
    name: 'Albert Einstein',
    bio: 'Physicist',
    era: '1879–1955',
    domain: 'Science',
    marks: [
      { title: 'Theory of Relativity', claimType: 'Discovery', domain: 'Science' },
      { title: 'Photoelectric Effect', claimType: 'Discovery', domain: 'Science' },
      { title: 'Mass-Energy Equivalence (E=mc²)', claimType: 'Formula', domain: 'Science' },
      { title: 'Brownian Motion', claimType: 'Discovery', domain: 'Science' },
      { title: 'Quantum Theory of Light', claimType: 'Theory', domain: 'Science' },
    ],
  },
  {
    name: 'Napoleon Bonaparte',
    bio: 'Military Commander & Emperor',
    era: '1769–1821',
    domain: 'Politics',
    marks: [
      { title: 'Corps System (modern military formation)', claimType: 'Innovation', domain: 'Politics' },
      { title: 'Napoleonic Code', claimType: 'Creation', domain: 'Law' },
      { title: 'Battle of Austerlitz formation', claimType: 'Strategy', domain: 'Politics' },
      { title: 'Metric System adoption', claimType: 'Innovation', domain: 'Culture' },
      { title: 'Lycée education system', claimType: 'Creation', domain: 'General' },
    ],
  },
  {
    name: 'Isaac Newton',
    bio: 'Mathematician & Physicist',
    era: '1643–1727',
    domain: 'Science',
    marks: [
      { title: 'Laws of Motion', claimType: 'Discovery', domain: 'Science' },
      { title: 'Universal Gravitation', claimType: 'Discovery', domain: 'Science' },
      { title: 'Calculus (co-discovery)', claimType: 'Innovation', domain: 'Science' },
      { title: 'Reflecting Telescope', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Colour theory (light spectrum)', claimType: 'Discovery', domain: 'Science' },
    ],
  },
  {
    name: 'Marie Curie',
    bio: 'Physicist & Chemist',
    era: '1867–1934',
    domain: 'Science',
    marks: [
      { title: 'Radioactivity (coined the term)', claimType: 'Discovery', domain: 'Science' },
      { title: 'Polonium', claimType: 'Discovery', domain: 'Science' },
      { title: 'Radium', claimType: 'Discovery', domain: 'Science' },
      { title: 'First woman Nobel Prize', claimType: 'Milestone', domain: 'Culture' },
      { title: 'Mobile X-ray units in WWI', claimType: 'Innovation', domain: 'General' },
    ],
  },
  {
    name: 'Leonardo da Vinci',
    bio: 'Artist & Inventor',
    era: '1452–1519',
    domain: 'VisualArt',
    marks: [
      { title: 'Aerial Screw (helicopter concept)', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Vitruvian Man', claimType: 'Creation', domain: 'VisualArt' },
      { title: 'Armoured Vehicle concept', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Solar Power concentrator concept', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Anatomical illustration standard', claimType: 'Innovation', domain: 'Science' },
    ],
  },
  {
    name: 'Nikola Tesla',
    bio: 'Inventor & Engineer',
    era: '1856–1943',
    domain: 'Technology',
    marks: [
      { title: 'Alternating Current (AC) system', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Tesla Coil', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Wireless energy transmission concept', claimType: 'Discovery', domain: 'Technology' },
      { title: 'Radio (disputed, but Tesla held early patents)', claimType: 'Innovation', domain: 'Technology' },
      { title: 'Rotating Magnetic Field', claimType: 'Discovery', domain: 'Science' },
    ],
  },
];

async function getOrCreateClaimType(name: string): Promise<string> {
  const { data: existing } = await supabase
    .from('claim_types')
    .select('id')
    .eq('name', name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: inserted, error } = await supabase
    .from('claim_types')
    .insert({ name, description: null })
    .select('id')
    .single();
  if (error) {
    console.warn(`Claim type "${name}" not found and insert failed:`, error.message);
    const { data: fallback } = await supabase.from('claim_types').select('id').eq('name', 'Creation').single();
    return fallback?.id ?? '';
  }
  return inserted?.id ?? '';
}

async function main() {
  const claimTypeCache: Record<string, string> = {};
  const getClaimTypeId = async (name: string): Promise<string> => {
    if (claimTypeCache[name]) return claimTypeCache[name];
    const id = await getOrCreateClaimType(name);
    claimTypeCache[name] = id;
    return id;
  };

  let systemUserId: string | null = null;
  const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
  systemUserId = firstProfile?.id ?? null;
  if (!systemUserId) {
    console.error('No profile found. Create at least one user account first.');
    process.exit(1);
  }

  for (const figure of FIGURES) {
    const { data: existing } = await supabase
      .from('historical_profiles')
      .select('id')
      .eq('name', figure.name)
      .maybeSingle();

    let profileId: string;
    if (existing) {
      profileId = existing.id;
      console.log(`Existing: ${figure.name}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('historical_profiles')
        .insert({
          name: figure.name,
          bio: figure.bio,
          era: figure.era,
          domain: figure.domain,
          created_by: systemUserId,
        })
        .select('id')
        .single();
      if (error) {
        console.error(`Failed to create ${figure.name}:`, error.message);
        continue;
      }
      profileId = inserted!.id;
      console.log(`Created: ${figure.name}`);
    }

    for (const mark of figure.marks) {
      const claimTypeId = await getClaimTypeId(mark.claimType);
      if (!claimTypeId) {
        console.warn(`Skipping mark "${mark.title}" (no claim type ${mark.claimType})`);
        continue;
      }
      const { data: existingMark } = await supabase
        .from('marks')
        .select('id')
        .eq('historical_profile_id', profileId)
        .eq('content', mark.title)
        .maybeSingle();
      if (existingMark) continue;

      const { error: insertErr } = await supabase.from('marks').insert({
        user_id: systemUserId,
        historical_profile_id: profileId,
        title: '',
        content: mark.title,
        category: 'General',
        domain: mark.domain,
        claim_type: mark.claimType,
        claim_type_id: claimTypeId,
      });
      if (insertErr) {
        console.warn(`Mark "${mark.title}" for ${figure.name}:`, insertErr.message);
      } else {
        console.log(`  + ${mark.title}`);
      }
    }
  }

  console.log('Seed done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
