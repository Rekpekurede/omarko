import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';
import type { ClaimType } from '@/lib/constants';

type Payload = {
  text?: string;
  imageCaption?: string;
  imageDescription?: string;
};

type Confidence = 'high' | 'medium' | 'low';

function pickDomain(input: string): (typeof DOMAINS)[number] {
  const lower = input.toLowerCase();
  if (/\b(recipe|ingredients|cook|cuisine|dish|meal|flavor|kitchen)\b/.test(lower)) return 'Food';
  if (/\b(song|music|album|beat|lyrics|melody)\b/.test(lower)) return 'Music';
  if (/\b(painting|art|sketch|gallery|illustration|design)\b/.test(lower)) return 'Visual Art';
  if (/\b(code|software|app|ai|ml|model|algorithm|startup|product)\b/.test(lower)) return 'Technology';
  if (/\b(science|experiment|research|hypothesis|data)\b/.test(lower)) return 'Science';
  if (/\b(church|faith|ethics|morality|philosophy|belief)\b/.test(lower)) return 'Philosophy';
  if (/\b(policy|government|election|law|rights)\b/.test(lower)) return 'Politics';
  if (/\b(trade|market|business|revenue|sales)\b/.test(lower)) return 'Business';
  if (/\b(sport|game|team|player|match|championship)\b/.test(lower)) return 'Sport';
  if (/\b(dance|choreography|performance)\b/.test(lower)) return 'Dance';
  if (/\b(book|novel|poem|literature|writing|author)\b/.test(lower)) return 'Literature';
  if (/\b(architecture|building|structure)\b/.test(lower)) return 'Architecture';
  if (/\b(culture|tradition|cultural)\b/.test(lower)) return 'Culture';
  return 'General';
}

function pickClaimType(input: string): { claimType: ClaimType; confidence: Confidence } {
  const lower = input.toLowerCase();

  // Strong matches -> high confidence
  if (/\b(i predict|i forecast|my prediction|i'm predicting)\b/.test(lower))
    return { claimType: 'Prediction', confidence: 'high' };
  if (/\b(i discovered|i found|i uncovered|first to discover)\b/.test(lower))
    return { claimType: 'Discovery', confidence: 'high' };
  if (/\b(i created|i made|i built|i wrote|i composed|my design|my invention)\b/.test(lower))
    return { claimType: 'Creation', confidence: 'high' };
  if (/\b(people quote me|they quoted|as i said|i said.*and they)\b/.test(lower))
    return { claimType: 'Quote', confidence: 'high' };
  if (/\b(my method|my framework|my process|i invented the.*method)\b/.test(lower))
    return { claimType: 'Method', confidence: 'high' };
  if (/\b(my theory|my formula|the formula i)\b/.test(lower))
    return { claimType: 'Theory', confidence: 'high' };
  if (/\b(strategy|roadmap|plan i devised)\b/.test(lower))
    return { claimType: 'Strategy', confidence: 'high' };
  if (/\b(first|fastest|most|record|achievement)\b/.test(lower))
    return { claimType: 'Record', confidence: 'high' };
  if (/\b(i observed|my observation|this observation|i noticed|my observation of)\b/.test(lower))
    return { claimType: 'Observation', confidence: 'high' };
  if (/\b(i organized|i hosted|my event|event i (created|organized|hosted|ran))\b/.test(lower))
    return { claimType: 'Event', confidence: 'high' };
  if (/\b(joke|bit|comedic|punchline|i joked|my joke)\b/.test(lower))
    return { claimType: 'Joke', confidence: 'high' };
  if (/\b(defend|defense|defending|i defend|my defense|argument for|case for)\b/.test(lower))
    return { claimType: 'Defense', confidence: 'high' };
  if (/\b(word i coined|i coined the word|my word|the word i)\b/.test(lower))
    return { claimType: 'Word', confidence: 'high' };
  if (/\b(scenario i (outlined|described|set out)|my scenario|the scenario i)\b/.test(lower))
    return { claimType: 'Scenario', confidence: 'high' };

  // Medium matches
  if (/\b(will|going to|forecast|predict|by 20\d{2}|soon)\b/.test(lower))
    return { claimType: 'Prediction', confidence: 'medium' };
  if (/\b(discovered|found|uncovered)\b/.test(lower))
    return { claimType: 'Discovery', confidence: 'medium' };
  if (/\b(observed|observation|noticed|documented|witnessed)\b/.test(lower))
    return { claimType: 'Observation', confidence: 'medium' };
  if (/\b(created|made|built|wrote|composed|design)\b/.test(lower))
    return { claimType: 'Creation', confidence: 'medium' };
  if (/\b(method|framework|process|steps|technique)\b/.test(lower))
    return { claimType: 'Method', confidence: 'medium' };
  if (/\b(should|must|we need|plan|strategy)\b/.test(lower))
    return { claimType: 'Strategy', confidence: 'medium' };
  if (/\b(innovation|improved|innovate)\b/.test(lower))
    return { claimType: 'Innovation', confidence: 'medium' };
  if (/\b(concept|idea|framework)\b/.test(lower))
    return { claimType: 'Concept', confidence: 'medium' };
  if (/\b(phrase|coined|term i)\b/.test(lower))
    return { claimType: 'Phrase', confidence: 'medium' };
  if (/\b(implement|implemented|built|executed)\b/.test(lower))
    return { claimType: 'Implementation', confidence: 'medium' };
  if (/\b(invite|challenge|invitation|join me)\b/.test(lower))
    return { claimType: 'Invite', confidence: 'medium' };
  if (/\b(design|designed)\b/.test(lower))
    return { claimType: 'Design', confidence: 'medium' };
  if (/\b(movement|trend|started the)\b/.test(lower))
    return { claimType: 'Movement', confidence: 'medium' };
  if (/\b(story|narrative|script|fiction)\b/.test(lower))
    return { claimType: 'Story', confidence: 'medium' };
  if (/\b(event|organized|hosted|conference|festival|gathering|show i put on)\b/.test(lower))
    return { claimType: 'Event', confidence: 'medium' };
  if (/\b(funny|humor|comedic|punchline)\b/.test(lower))
    return { claimType: 'Joke', confidence: 'medium' };
  if (/\b(defense|defending|advocate|argument for|in defense of)\b/.test(lower))
    return { claimType: 'Defense', confidence: 'medium' };
  if (/\b(coined|neologism|my word|defined the term|word for)\b/.test(lower))
    return { claimType: 'Word', confidence: 'medium' };
  if (/\b(scenario|situation i (outlined|described)|what if|imagine that)\b/.test(lower))
    return { claimType: 'Scenario', confidence: 'medium' };

  // Fallback -> low confidence (UI will not show)
  return { claimType: 'Concept', confidence: 'low' };
}

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  const imageCaption = (body.imageCaption ?? '').trim();
  const imageDescription = (body.imageDescription ?? '').trim();
  const combined = [text, imageCaption, imageDescription].filter(Boolean).join(' ');

  if (!combined) {
    return NextResponse.json({
      claimType: 'Concept',
      domain: 'General',
      confidence: 'low',
    });
  }

  const { claimType, confidence } = pickClaimType(combined);
  const domain = pickDomain(combined);

  return NextResponse.json({
    claimType,
    domain,
    confidence,
  });
}
