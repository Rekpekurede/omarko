import type { ClaimType } from './types';

/** Ordered list of claim types; must match keys of CLAIM_TYPE_DESCRIPTIONS in types.ts. */
export const CLAIM_TYPES: readonly ClaimType[] = [
  'Argument',
  'Concept',
  'Creation',
  'Defense',
  'Diagnosis',
  'Design',
  'Discovery',
  'Event',
  'Formula',
  'Implementation',
  'Innovation',
  'Invite',
  'Joke',
  'Method',
  'Movement',
  'Naming',
  'Observation',
  'Petition',
  'Phrase',
  'Prediction',
  'Perspective',
  'Question',
  'Quote',
  'Record',
  'Rule',
  'Scenario',
  'Strategy',
  'Story',
  'Theory',
  'Trend',
  'Word',
];

export type { ClaimType };
