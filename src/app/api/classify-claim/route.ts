import { NextResponse } from 'next/server';
import { DOMAINS } from '@/lib/types';

type Payload = {
  text?: string;
  imageCaption?: string;
  imageDescription?: string;
};

function pickDomain(input: string): (typeof DOMAINS)[number] {
  const lower = input.toLowerCase();
  if (/\b(recipe|ingredients|cook|cuisine|dish|meal|flavor|kitchen)\b/.test(lower)) return 'Food';
  if (/\b(song|music|album|beat|lyrics|melody)\b/.test(lower)) return 'Music';
  if (/\b(painting|art|sketch|gallery|illustration|design)\b/.test(lower)) return 'VisualArt';
  if (/\b(code|software|app|ai|ml|model|algorithm|startup|product)\b/.test(lower)) return 'Technology';
  if (/\b(science|experiment|research|hypothesis|data)\b/.test(lower)) return 'Science';
  if (/\b(church|faith|ethics|morality|philosophy|belief)\b/.test(lower)) return 'Philosophy';
  if (/\b(policy|government|election|law|rights)\b/.test(lower)) return 'Politics';
  if (/\b(trade|market|business|revenue|sales)\b/.test(lower)) return 'Business';
  return 'General';
}

function pickClaimType(input: string): string {
  const lower = input.toLowerCase();
  if (/\b(will|going to|forecast|predict|by 20\d{2}|soon)\b/.test(lower)) return 'Prediction';
  if (/\b(i discovered|i found|uncovered|noticed|observed)\b/.test(lower)) return 'Discovery';
  if (/\b(i created|i made|i built|i wrote|i composed|my design)\b/.test(lower)) return 'Creation';
  if (/\b(should|must|we need|plan|roadmap|strategy)\b/.test(lower)) return 'Stance';
  if (/\b(i think|i believe|in my view|opinion)\b/.test(lower)) return 'Opinion';
  if (/\b(teach|lesson|guide|tutorial|how to)\b/.test(lower)) return 'Teaching';
  if (/\b(method|framework|process|steps)\b/.test(lower)) return 'Method';
  return 'Opinion';
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
      claimType: 'Opinion',
      domain: 'General',
    });
  }

  return NextResponse.json({
    claimType: pickClaimType(combined),
    domain: pickDomain(combined),
  });
}
