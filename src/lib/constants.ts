import type { ClaimType } from './types';

/** Ordered list of claim types; must match keys of CLAIM_TYPE_DESCRIPTIONS in types.ts. */
export const CLAIM_TYPES: readonly ClaimType[] = [
  'Creation',
  'Prediction',
  'Discovery',
  'Event',
  'Innovation',
  'Strategy',
  'Record',
  'Implementation',
  'Invite',
  'Quote',
  'Concept',
  'Method',
  'Theory',
  'Phrase',
  'Formula',
  'Design',
  'Movement',
  'Observation',
  'Perspective',
  'Trend',
  'Story',
  'Joke',
  'Defense',
  'Word',
];

export type { ClaimType };
